"""
TLS 1.3 configuration service for secure data in transit.

This module provides comprehensive TLS configuration for FastAPI applications,
ensuring secure communication with modern TLS 1.3 protocols and best practices.
"""

import ssl
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

import structlog
from pydantic import BaseModel, Field
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from .config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class TLSCertificateInfo(BaseModel):
    """TLS certificate information."""
    
    subject: str = Field(..., description="Certificate subject")
    issuer: str = Field(..., description="Certificate issuer")
    serial_number: str = Field(..., description="Certificate serial number")
    not_valid_before: datetime = Field(..., description="Certificate valid from")
    not_valid_after: datetime = Field(..., description="Certificate valid until")
    fingerprint_sha256: str = Field(..., description="SHA256 fingerprint")
    key_size: int = Field(..., description="Public key size in bits")
    signature_algorithm: str = Field(..., description="Signature algorithm")
    san_dns_names: List[str] = Field(default_factory=list, description="Subject Alternative Names")
    is_self_signed: bool = Field(..., description="Whether certificate is self-signed")
    days_until_expiry: int = Field(..., description="Days until certificate expires")


class TLSConfiguration(BaseModel):
    """TLS configuration settings."""
    
    # Certificate paths
    cert_file: Optional[str] = Field(None, description="Path to certificate file")
    key_file: Optional[str] = Field(None, description="Path to private key file")
    ca_file: Optional[str] = Field(None, description="Path to CA certificate file")
    
    # TLS settings
    min_version: str = Field(default="TLSv1.3", description="Minimum TLS version")
    max_version: str = Field(default="TLSv1.3", description="Maximum TLS version")
    ciphers: List[str] = Field(
        default_factory=lambda: [
            "TLS_AES_256_GCM_SHA384",
            "TLS_CHACHA20_POLY1305_SHA256",
            "TLS_AES_128_GCM_SHA256"
        ],
        description="Allowed cipher suites"
    )
    
    # Security options
    verify_mode: str = Field(default="CERT_REQUIRED", description="Certificate verification mode")
    check_hostname: bool = Field(default=True, description="Whether to check hostname")
    require_sni: bool = Field(default=True, description="Require Server Name Indication")
    
    # HSTS settings
    enable_hsts: bool = Field(default=True, description="Enable HTTP Strict Transport Security")
    hsts_max_age: int = Field(default=31536000, description="HSTS max age in seconds")
    hsts_include_subdomains: bool = Field(default=True, description="Include subdomains in HSTS")
    hsts_preload: bool = Field(default=False, description="Enable HSTS preload")
    
    # Additional security headers
    enable_security_headers: bool = Field(default=True, description="Enable additional security headers")


class TLSConfigurationService:
    """Service for TLS 1.3 configuration and certificate management."""
    
    def __init__(self):
        self.logger = logger.bind(service="tls_config")
        self.config = TLSConfiguration()
        self._ssl_context: Optional[ssl.SSLContext] = None
    
    def create_ssl_context(
        self, 
        cert_file: Optional[str] = None,
        key_file: Optional[str] = None,
        ca_file: Optional[str] = None
    ) -> ssl.SSLContext:
        """
        Create SSL context with TLS 1.3 configuration.
        
        Args:
            cert_file: Path to certificate file
            key_file: Path to private key file
            ca_file: Path to CA certificate file
            
        Returns:
            Configured SSL context
        """
        try:
            # Create SSL context with TLS 1.3
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            
            # Set minimum and maximum TLS versions
            context.minimum_version = ssl.TLSVersion.TLSv1_3
            context.maximum_version = ssl.TLSVersion.TLSv1_3
            
            # Configure cipher suites for TLS 1.3
            context.set_ciphers(':'.join(self.config.ciphers))
            
            # Security options
            context.options |= ssl.OP_NO_SSLv2
            context.options |= ssl.OP_NO_SSLv3
            context.options |= ssl.OP_NO_TLSv1
            context.options |= ssl.OP_NO_TLSv1_1
            context.options |= ssl.OP_NO_TLSv1_2
            context.options |= ssl.OP_SINGLE_DH_USE
            context.options |= ssl.OP_SINGLE_ECDH_USE
            context.options |= ssl.OP_NO_COMPRESSION
            
            # Certificate verification
            if self.config.verify_mode == "CERT_REQUIRED":
                context.verify_mode = ssl.CERT_REQUIRED
            elif self.config.verify_mode == "CERT_OPTIONAL":
                context.verify_mode = ssl.CERT_OPTIONAL
            else:
                context.verify_mode = ssl.CERT_NONE
            
            context.check_hostname = self.config.check_hostname
            
            # Load certificates if provided
            cert_path = cert_file or self.config.cert_file
            key_path = key_file or self.config.key_file
            ca_path = ca_file or self.config.ca_file
            
            if cert_path and key_path:
                if os.path.exists(cert_path) and os.path.exists(key_path):
                    context.load_cert_chain(cert_path, key_path)
                    self.logger.info("Loaded TLS certificate", 
                                   cert_file=cert_path, 
                                   key_file=key_path)
                else:
                    self.logger.warning("Certificate files not found, generating self-signed certificate")
                    self._generate_self_signed_certificate()
                    context.load_cert_chain(self.config.cert_file, self.config.key_file)
            
            if ca_path and os.path.exists(ca_path):
                context.load_verify_locations(ca_path)
                self.logger.info("Loaded CA certificate", ca_file=ca_path)
            
            self._ssl_context = context
            self.logger.info("Created TLS 1.3 SSL context")
            
            return context
            
        except Exception as e:
            self.logger.error("Failed to create SSL context", error=str(e))
            raise
    
    def _generate_self_signed_certificate(self):
        """Generate self-signed certificate for development."""
        try:
            # Generate private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            
            # Create certificate
            subject = issuer = x509.Name([
                x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
                x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "CA"),
                x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "GiveMeJobs"),
                x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
            ])
            
            cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                issuer
            ).public_key(
                private_key.public_key()
            ).serial_number(
                x509.random_serial_number()
            ).not_valid_before(
                datetime.utcnow()
            ).not_valid_after(
                datetime.utcnow() + timedelta(days=365)
            ).add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName("localhost"),
                    x509.DNSName("127.0.0.1"),
                    x509.DNSName("0.0.0.0"),
                ]),
                critical=False,
            ).sign(private_key, hashes.SHA256())
            
            # Create certificates directory
            cert_dir = Path("./certs")
            cert_dir.mkdir(exist_ok=True)
            
            # Write certificate and key files
            cert_file = cert_dir / "server.crt"
            key_file = cert_dir / "server.key"
            
            with open(cert_file, "wb") as f:
                f.write(cert.public_bytes(serialization.Encoding.PEM))
            
            with open(key_file, "wb") as f:
                f.write(private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            
            # Update configuration
            self.config.cert_file = str(cert_file)
            self.config.key_file = str(key_file)
            
            self.logger.info("Generated self-signed certificate", 
                           cert_file=str(cert_file), 
                           key_file=str(key_file))
            
        except Exception as e:
            self.logger.error("Failed to generate self-signed certificate", error=str(e))
            raise
    
    def get_certificate_info(self, cert_file: Optional[str] = None) -> Optional[TLSCertificateInfo]:
        """
        Get information about a TLS certificate.
        
        Args:
            cert_file: Path to certificate file
            
        Returns:
            Certificate information or None if not available
        """
        try:
            cert_path = cert_file or self.config.cert_file
            
            if not cert_path or not os.path.exists(cert_path):
                return None
            
            with open(cert_path, 'rb') as f:
                cert_data = f.read()
            
            cert = x509.load_pem_x509_certificate(cert_data)
            
            # Extract certificate information
            subject = cert.subject.rfc4514_string()
            issuer = cert.issuer.rfc4514_string()
            serial_number = str(cert.serial_number)
            not_valid_before = cert.not_valid_before
            not_valid_after = cert.not_valid_after
            
            # Calculate fingerprint
            fingerprint = cert.fingerprint(hashes.SHA256()).hex()
            
            # Get public key info
            public_key = cert.public_key()
            key_size = public_key.key_size if hasattr(public_key, 'key_size') else 0
            
            # Get signature algorithm
            signature_algorithm = cert.signature_algorithm_oid._name
            
            # Get SAN DNS names
            san_dns_names = []
            try:
                san_extension = cert.extensions.get_extension_for_oid(x509.oid.ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
                san_dns_names = [name.value for name in san_extension.value if isinstance(name, x509.DNSName)]
            except x509.ExtensionNotFound:
                pass
            
            # Check if self-signed
            is_self_signed = subject == issuer
            
            # Calculate days until expiry
            days_until_expiry = (not_valid_after - datetime.utcnow()).days
            
            return TLSCertificateInfo(
                subject=subject,
                issuer=issuer,
                serial_number=serial_number,
                not_valid_before=not_valid_before,
                not_valid_after=not_valid_after,
                fingerprint_sha256=fingerprint,
                key_size=key_size,
                signature_algorithm=signature_algorithm,
                san_dns_names=san_dns_names,
                is_self_signed=is_self_signed,
                days_until_expiry=days_until_expiry
            )
            
        except Exception as e:
            self.logger.error("Failed to get certificate info", 
                            cert_file=cert_path, error=str(e))
            return None
    
    def get_security_headers(self) -> Dict[str, str]:
        """
        Get security headers for HTTPS responses.
        
        Returns:
            Dictionary of security headers
        """
        headers = {}
        
        if self.config.enable_hsts:
            hsts_value = f"max-age={self.config.hsts_max_age}"
            if self.config.hsts_include_subdomains:
                hsts_value += "; includeSubDomains"
            if self.config.hsts_preload:
                hsts_value += "; preload"
            headers["Strict-Transport-Security"] = hsts_value
        
        if self.config.enable_security_headers:
            headers.update({
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "X-XSS-Protection": "1; mode=block",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
                "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
            })
        
        return headers
    
    def validate_tls_configuration(self) -> Dict[str, Any]:
        """
        Validate current TLS configuration.
        
        Returns:
            Validation results
        """
        results = {
            "valid": True,
            "warnings": [],
            "errors": [],
            "recommendations": []
        }
        
        try:
            # Check certificate files
            if self.config.cert_file and not os.path.exists(self.config.cert_file):
                results["errors"].append(f"Certificate file not found: {self.config.cert_file}")
                results["valid"] = False
            
            if self.config.key_file and not os.path.exists(self.config.key_file):
                results["errors"].append(f"Private key file not found: {self.config.key_file}")
                results["valid"] = False
            
            # Check certificate validity
            cert_info = self.get_certificate_info()
            if cert_info:
                if cert_info.days_until_expiry < 30:
                    results["warnings"].append(f"Certificate expires in {cert_info.days_until_expiry} days")
                
                if cert_info.is_self_signed:
                    results["warnings"].append("Using self-signed certificate")
                
                if cert_info.key_size < 2048:
                    results["warnings"].append(f"Certificate key size ({cert_info.key_size}) is less than recommended 2048 bits")
            
            # Check TLS version
            if self.config.min_version != "TLSv1.3":
                results["recommendations"].append("Consider using TLS 1.3 as minimum version")
            
            # Check HSTS configuration
            if not self.config.enable_hsts:
                results["recommendations"].append("Enable HSTS for better security")
            elif self.config.hsts_max_age < 31536000:  # 1 year
                results["recommendations"].append("Consider increasing HSTS max-age to at least 1 year")
            
            self.logger.info("TLS configuration validation completed", 
                           valid=results["valid"],
                           warnings_count=len(results["warnings"]),
                           errors_count=len(results["errors"]))
            
            return results
            
        except Exception as e:
            self.logger.error("Failed to validate TLS configuration", error=str(e))
            results["valid"] = False
            results["errors"].append(f"Validation error: {str(e)}")
            return results
    
    def get_uvicorn_ssl_config(self) -> Dict[str, Any]:
        """
        Get SSL configuration for Uvicorn server.
        
        Returns:
            Uvicorn SSL configuration dictionary
        """
        config = {}
        
        if self.config.cert_file and self.config.key_file:
            config.update({
                "ssl_certfile": self.config.cert_file,
                "ssl_keyfile": self.config.key_file,
                "ssl_version": ssl.PROTOCOL_TLS_SERVER,
                "ssl_cert_reqs": ssl.CERT_NONE,  # Client certificates not required
                "ssl_ciphers": "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256"
            })
            
            if self.config.ca_file:
                config["ssl_ca_certs"] = self.config.ca_file
        
        return config


class TLSMiddleware:
    """FastAPI middleware for TLS security headers."""
    
    def __init__(self, tls_service: TLSConfigurationService):
        self.tls_service = tls_service
        self.logger = logger.bind(middleware="tls")
    
    async def __call__(self, request, call_next):
        """Process request and add security headers."""
        response = await call_next(request)
        
        # Add security headers for HTTPS requests
        if request.url.scheme == "https":
            security_headers = self.tls_service.get_security_headers()
            for header_name, header_value in security_headers.items():
                response.headers[header_name] = header_value
        
        return response


# Global TLS service instance
_tls_service: Optional[TLSConfigurationService] = None


def get_tls_service() -> TLSConfigurationService:
    """Get global TLS configuration service instance."""
    global _tls_service
    if _tls_service is None:
        _tls_service = TLSConfigurationService()
    return _tls_service


def setup_tls_for_fastapi(app, cert_file: Optional[str] = None, key_file: Optional[str] = None):
    """
    Setup TLS configuration for FastAPI application.
    
    Args:
        app: FastAPI application instance
        cert_file: Path to certificate file
        key_file: Path to private key file
    """
    tls_service = get_tls_service()
    
    # Create SSL context
    tls_service.create_ssl_context(cert_file, key_file)
    
    # Add TLS middleware
    app.add_middleware(TLSMiddleware, tls_service=tls_service)
    
    # Validate configuration
    validation_results = tls_service.validate_tls_configuration()
    if not validation_results["valid"]:
        logger.warning("TLS configuration has issues", 
                      errors=validation_results["errors"],
                      warnings=validation_results["warnings"])
    
    logger.info("TLS configuration setup completed for FastAPI")