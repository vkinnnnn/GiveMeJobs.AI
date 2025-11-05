"""Custom Pydantic validators for enhanced validation."""

import re
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, date
from email_validator import validate_email, EmailNotValidError
from pydantic import field_validator, ValidationInfo
from pydantic_core import PydanticCustomError


class ValidationUtils:
    """Utility class for common validation functions."""
    
    @staticmethod
    def validate_email_address(email: str) -> str:
        """Validate email address format."""
        try:
            # Use email-validator library for comprehensive validation
            validated_email = validate_email(email)
            return validated_email.email
        except EmailNotValidError as e:
            raise PydanticCustomError(
                'email_invalid',
                'Invalid email address: {error}',
                {'error': str(e)}
            )
    
    @staticmethod
    def validate_password_strength(password: str) -> str:
        """Validate password strength requirements."""
        if len(password) < 8:
            raise PydanticCustomError(
                'password_too_short',
                'Password must be at least 8 characters long',
                {}
            )
        
        if len(password) > 128:
            raise PydanticCustomError(
                'password_too_long',
                'Password must not exceed 128 characters',
                {}
            )
        
        # Check for required character types
        has_lower = bool(re.search(r'[a-z]', password))
        has_upper = bool(re.search(r'[A-Z]', password))
        has_digit = bool(re.search(r'\d', password))
        has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
        
        missing_requirements = []
        if not has_lower:
            missing_requirements.append('lowercase letter')
        if not has_upper:
            missing_requirements.append('uppercase letter')
        if not has_digit:
            missing_requirements.append('digit')
        if not has_special:
            missing_requirements.append('special character')
        
        if missing_requirements:
            raise PydanticCustomError(
                'password_weak',
                'Password must contain at least one {requirements}',
                {'requirements': ', '.join(missing_requirements)}
            )
        
        # Check for common weak patterns
        if re.search(r'(.)\1{2,}', password):  # Three or more repeated characters
            raise PydanticCustomError(
                'password_repeated_chars',
                'Password cannot contain three or more repeated characters',
                {}
            )
        
        # Check for common sequences
        sequences = ['123', 'abc', 'qwe', 'asd', 'zxc']
        password_lower = password.lower()
        for seq in sequences:
            if seq in password_lower or seq[::-1] in password_lower:
                raise PydanticCustomError(
                    'password_common_sequence',
                    'Password cannot contain common sequences',
                    {}
                )
        
        return password
    
    @staticmethod
    def validate_phone_number(phone: str) -> str:
        """Validate phone number format."""
        # Remove all non-digit characters
        digits_only = re.sub(r'\D', '', phone)
        
        # Check length (10-15 digits is reasonable for international numbers)
        if len(digits_only) < 10:
            raise PydanticCustomError(
                'phone_too_short',
                'Phone number must contain at least 10 digits',
                {}
            )
        
        if len(digits_only) > 15:
            raise PydanticCustomError(
                'phone_too_long',
                'Phone number must not exceed 15 digits',
                {}
            )
        
        # Format as international number if it starts with country code
        if len(digits_only) == 11 and digits_only.startswith('1'):
            return f"+1-{digits_only[1:4]}-{digits_only[4:7]}-{digits_only[7:]}"
        elif len(digits_only) == 10:
            return f"{digits_only[:3]}-{digits_only[3:6]}-{digits_only[6:]}"
        else:
            return f"+{digits_only}"
    
    @staticmethod
    def validate_url(url: str) -> str:
        """Validate URL format."""
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        if not url_pattern.match(url):
            raise PydanticCustomError(
                'url_invalid',
                'Invalid URL format',
                {}
            )
        
        return url
    
    @staticmethod
    def validate_date_range(start_date: date, end_date: Optional[date]) -> Optional[date]:
        """Validate that end date is after start date."""
        if end_date and end_date <= start_date:
            raise PydanticCustomError(
                'date_range_invalid',
                'End date must be after start date',
                {}
            )
        return end_date
    
    @staticmethod
    def validate_salary_range(min_salary: Optional[int], max_salary: Optional[int]) -> Optional[int]:
        """Validate salary range."""
        if min_salary and max_salary and max_salary <= min_salary:
            raise PydanticCustomError(
                'salary_range_invalid',
                'Maximum salary must be greater than minimum salary',
                {}
            )
        return max_salary
    
    @staticmethod
    def validate_skills_list(skills: List[str]) -> List[str]:
        """Validate and clean skills list."""
        if not skills:
            return skills
        
        # Remove duplicates and empty strings
        cleaned_skills = []
        seen_skills = set()
        
        for skill in skills:
            skill = skill.strip()
            if skill and skill.lower() not in seen_skills:
                cleaned_skills.append(skill)
                seen_skills.add(skill.lower())
        
        # Limit number of skills
        if len(cleaned_skills) > 50:
            raise PydanticCustomError(
                'too_many_skills',
                'Maximum 50 skills allowed',
                {}
            )
        
        # Validate individual skill names
        for skill in cleaned_skills:
            if len(skill) > 100:
                raise PydanticCustomError(
                    'skill_name_too_long',
                    'Skill name cannot exceed 100 characters',
                    {}
                )
            
            if not re.match(r'^[a-zA-Z0-9\s\-\+\#\.]+$', skill):
                raise PydanticCustomError(
                    'skill_name_invalid',
                    f'Invalid characters in skill name: {skill}',
                    {}
                )
        
        return cleaned_skills
    
    @staticmethod
    def validate_text_content(text: str, min_length: int = 0, max_length: int = 10000) -> str:
        """Validate text content for length and basic safety."""
        text = text.strip()
        
        if len(text) < min_length:
            raise PydanticCustomError(
                'text_too_short',
                f'Text must be at least {min_length} characters long',
                {}
            )
        
        if len(text) > max_length:
            raise PydanticCustomError(
                'text_too_long',
                f'Text cannot exceed {max_length} characters',
                {}
            )
        
        # Check for potentially malicious content
        suspicious_patterns = [
            r'<script[^>]*>.*?</script>',  # Script tags
            r'javascript:',  # JavaScript URLs
            r'on\w+\s*=',  # Event handlers
            r'<iframe[^>]*>.*?</iframe>',  # Iframes
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, text, re.IGNORECASE | re.DOTALL):
                raise PydanticCustomError(
                    'text_suspicious_content',
                    'Text contains potentially unsafe content',
                    {}
                )
        
        return text
    
    @staticmethod
    def validate_file_size(file_size: int, max_size_mb: int = 10) -> int:
        """Validate file size."""
        max_size_bytes = max_size_mb * 1024 * 1024
        
        if file_size > max_size_bytes:
            raise PydanticCustomError(
                'file_too_large',
                f'File size cannot exceed {max_size_mb}MB',
                {}
            )
        
        return file_size
    
    @staticmethod
    def validate_file_type(filename: str, allowed_types: List[str]) -> str:
        """Validate file type by extension."""
        if not filename:
            raise PydanticCustomError(
                'filename_required',
                'Filename is required',
                {}
            )
        
        # Extract file extension
        file_extension = filename.lower().split('.')[-1] if '.' in filename else ''
        
        if file_extension not in [ext.lower() for ext in allowed_types]:
            raise PydanticCustomError(
                'file_type_invalid',
                f'File type .{file_extension} not allowed. Allowed types: {", ".join(allowed_types)}',
                {}
            )
        
        return filename


# Common validator decorators
def email_validator(field_name: str = 'email'):
    """Decorator for email validation."""
    def validator(cls, v: str, info: ValidationInfo) -> str:
        return ValidationUtils.validate_email_address(v)
    return field_validator(field_name)(validator)


def password_validator(field_name: str = 'password'):
    """Decorator for password validation."""
    def validator(cls, v: str, info: ValidationInfo) -> str:
        return ValidationUtils.validate_password_strength(v)
    return field_validator(field_name)(validator)


def phone_validator(field_name: str = 'phone'):
    """Decorator for phone number validation."""
    def validator(cls, v: str, info: ValidationInfo) -> str:
        return ValidationUtils.validate_phone_number(v)
    return field_validator(field_name)(validator)


def url_validator(field_name: str = 'url'):
    """Decorator for URL validation."""
    def validator(cls, v: str, info: ValidationInfo) -> str:
        return ValidationUtils.validate_url(v)
    return field_validator(field_name)(validator)


def skills_validator(field_name: str = 'skills'):
    """Decorator for skills list validation."""
    def validator(cls, v: List[str], info: ValidationInfo) -> List[str]:
        return ValidationUtils.validate_skills_list(v)
    return field_validator(field_name)(validator)


def text_validator(min_length: int = 0, max_length: int = 10000):
    """Decorator for text content validation."""
    def decorator(field_name: str):
        def validator(cls, v: str, info: ValidationInfo) -> str:
            return ValidationUtils.validate_text_content(v, min_length, max_length)
        return field_validator(field_name)(validator)
    return decorator