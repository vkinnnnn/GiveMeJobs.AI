"""Utility functions for semantic search service."""

import re
import string
from typing import List, Dict, Any, Set
import numpy as np
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS


class TextProcessor:
    """Text processing utilities for semantic search."""
    
    def __init__(self):
        self.stop_words = set(ENGLISH_STOP_WORDS)
        self.stop_words.update(['job', 'work', 'position', 'role', 'opportunity', 'career'])
        
    def clean_text(self, text: str) -> str:
        """Clean and normalize text for processing."""
        if not text:
            return ""
            
        # Convert to lowercase
        text = text.lower()
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove punctuation except hyphens and periods in numbers
        text = re.sub(r'[^\w\s\-\.]', ' ', text)
        
        return text.strip()
        
    def extract_keywords(self, text: str, min_length: int = 2, max_keywords: int = 50) -> List[str]:
        """Extract meaningful keywords from text."""
        if not text:
            return []
            
        cleaned_text = self.clean_text(text)
        words = cleaned_text.split()
        
        # Filter words
        keywords = []
        for word in words:
            if (len(word) >= min_length and 
                word not in self.stop_words and 
                not word.isdigit() and
                word.isalpha()):
                keywords.append(word)
                
        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for keyword in keywords:
            if keyword not in seen:
                seen.add(keyword)
                unique_keywords.append(keyword)
                
        return unique_keywords[:max_keywords]
        
    def extract_skills(self, text: str) -> List[str]:
        """Extract technical skills from text."""
        # Common technical skills patterns
        skill_patterns = [
            r'\b(?:python|java|javascript|typescript|react|angular|vue|node\.?js|express)\b',
            r'\b(?:sql|mysql|postgresql|mongodb|redis|elasticsearch)\b',
            r'\b(?:aws|azure|gcp|docker|kubernetes|jenkins|git)\b',
            r'\b(?:html|css|sass|less|bootstrap|tailwind)\b',
            r'\b(?:api|rest|graphql|microservices|devops)\b',
            r'\b(?:machine learning|ml|ai|data science|analytics)\b',
            r'\b(?:agile|scrum|kanban|jira|confluence)\b'
        ]
        
        skills = []
        cleaned_text = self.clean_text(text)
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, cleaned_text, re.IGNORECASE)
            skills.extend(matches)
            
        # Remove duplicates and normalize
        unique_skills = list(set(skill.lower() for skill in skills))
        return unique_skills
        
    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts using Jaccard similarity."""
        if not text1 or not text2:
            return 0.0
            
        keywords1 = set(self.extract_keywords(text1))
        keywords2 = set(self.extract_keywords(text2))
        
        if not keywords1 or not keywords2:
            return 0.0
            
        intersection = keywords1.intersection(keywords2)
        union = keywords1.union(keywords2)
        
        return len(intersection) / len(union) if union else 0.0


class VectorUtils:
    """Vector processing utilities."""
    
    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        if len(vec1) != len(vec2):
            raise ValueError("Vectors must have the same dimension")
            
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        
        dot_product = np.dot(vec1_np, vec2_np)
        norm1 = np.linalg.norm(vec1_np)
        norm2 = np.linalg.norm(vec2_np)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        return float(dot_product / (norm1 * norm2))
        
    @staticmethod
    def euclidean_distance(vec1: List[float], vec2: List[float]) -> float:
        """Calculate Euclidean distance between two vectors."""
        if len(vec1) != len(vec2):
            raise ValueError("Vectors must have the same dimension")
            
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        
        return float(np.linalg.norm(vec1_np - vec2_np))
        
    @staticmethod
    def normalize_vector(vector: List[float]) -> List[float]:
        """Normalize a vector to unit length."""
        vec_np = np.array(vector)
        norm = np.linalg.norm(vec_np)
        
        if norm == 0:
            return vector
            
        normalized = vec_np / norm
        return normalized.tolist()
        
    @staticmethod
    def average_vectors(vectors: List[List[float]]) -> List[float]:
        """Calculate the average of multiple vectors."""
        if not vectors:
            return []
            
        if len(vectors) == 1:
            return vectors[0]
            
        # Check all vectors have same dimension
        dim = len(vectors[0])
        for vec in vectors[1:]:
            if len(vec) != dim:
                raise ValueError("All vectors must have the same dimension")
                
        # Calculate average
        avg_vec = np.mean(vectors, axis=0)
        return avg_vec.tolist()


class JobMatchingUtils:
    """Utilities for job matching logic."""
    
    @staticmethod
    def calculate_skill_match_score(user_skills: List[str], job_skills: List[str]) -> Dict[str, Any]:
        """Calculate detailed skill matching score."""
        if not user_skills or not job_skills:
            return {
                "score": 0.0,
                "matching_skills": [],
                "missing_skills": job_skills if job_skills else [],
                "extra_skills": user_skills if user_skills else []
            }
            
        user_skills_set = set(skill.lower().strip() for skill in user_skills)
        job_skills_set = set(skill.lower().strip() for skill in job_skills)
        
        matching_skills = user_skills_set.intersection(job_skills_set)
        missing_skills = job_skills_set - user_skills_set
        extra_skills = user_skills_set - job_skills_set
        
        # Calculate score based on coverage of required skills
        score = len(matching_skills) / len(job_skills_set) if job_skills_set else 0.0
        
        return {
            "score": score,
            "matching_skills": list(matching_skills),
            "missing_skills": list(missing_skills),
            "extra_skills": list(extra_skills)
        }
        
    @staticmethod
    def calculate_experience_match_score(user_years: int, required_level: str) -> Dict[str, Any]:
        """Calculate experience matching score."""
        level_mapping = {
            'entry': (0, 2),
            'junior': (1, 3),
            'mid': (3, 6),
            'senior': (5, 10),
            'lead': (7, 15),
            'principal': (10, 20),
            'executive': (15, 30)
        }
        
        if not required_level or required_level.lower() not in level_mapping:
            return {
                "score": 1.0,  # No specific requirement
                "user_years": user_years,
                "required_range": None,
                "match_type": "no_requirement"
            }
            
        min_years, max_years = level_mapping[required_level.lower()]
        
        if user_years < min_years:
            # Under-qualified
            score = user_years / min_years if min_years > 0 else 0.0
            match_type = "under_qualified"
        elif user_years > max_years:
            # Over-qualified (still good match but might be overqualified)
            score = 0.9  # Slight penalty for being overqualified
            match_type = "over_qualified"
        else:
            # Perfect match
            score = 1.0
            match_type = "perfect_match"
            
        return {
            "score": score,
            "user_years": user_years,
            "required_range": (min_years, max_years),
            "match_type": match_type
        }
        
    @staticmethod
    def calculate_location_match_score(user_locations: List[str], job_location: str, remote_type: str = None) -> Dict[str, Any]:
        """Calculate location matching score."""
        if not job_location:
            return {
                "score": 1.0,  # No location requirement
                "match_type": "no_requirement"
            }
            
        # Handle remote work
        if remote_type and remote_type.lower() in ['remote', 'fully_remote']:
            return {
                "score": 1.0,
                "match_type": "remote_work"
            }
            
        if not user_locations:
            return {
                "score": 0.5,  # Neutral score when user has no location preference
                "match_type": "no_preference"
            }
            
        # Check for location matches
        job_location_lower = job_location.lower()
        for user_location in user_locations:
            user_location_lower = user_location.lower()
            
            # Exact match
            if user_location_lower == job_location_lower:
                return {
                    "score": 1.0,
                    "match_type": "exact_match",
                    "matching_location": user_location
                }
                
            # Partial match (city in state, etc.)
            if user_location_lower in job_location_lower or job_location_lower in user_location_lower:
                return {
                    "score": 0.8,
                    "match_type": "partial_match",
                    "matching_location": user_location
                }
                
        return {
            "score": 0.2,  # Low score for no location match
            "match_type": "no_match"
        }
        
    @staticmethod
    def calculate_salary_match_score(user_min: int, user_max: int, job_min: int, job_max: int) -> Dict[str, Any]:
        """Calculate salary matching score."""
        if not user_min and not user_max:
            return {
                "score": 1.0,  # No salary requirement
                "match_type": "no_requirement"
            }
            
        if not job_min and not job_max:
            return {
                "score": 0.5,  # No salary information from job
                "match_type": "no_job_info"
            }
            
        # Use provided values or defaults
        user_min = user_min or 0
        user_max = user_max or user_min * 1.5 if user_min else float('inf')
        job_min = job_min or 0
        job_max = job_max or job_min * 1.5 if job_min else float('inf')
        
        # Calculate overlap
        overlap_min = max(user_min, job_min)
        overlap_max = min(user_max, job_max)
        
        if overlap_min > overlap_max:
            # No overlap
            if job_max < user_min:
                return {
                    "score": 0.1,
                    "match_type": "below_expectation",
                    "gap": user_min - job_max
                }
            else:
                return {
                    "score": 0.3,
                    "match_type": "above_expectation",
                    "gap": job_min - user_max
                }
        else:
            # Calculate overlap percentage
            user_range = user_max - user_min
            job_range = job_max - job_min
            overlap_range = overlap_max - overlap_min
            
            if user_range == 0 and job_range == 0:
                score = 1.0 if user_min == job_min else 0.5
            else:
                avg_range = (user_range + job_range) / 2
                score = min(overlap_range / avg_range, 1.0) if avg_range > 0 else 1.0
                
            return {
                "score": score,
                "match_type": "overlap",
                "overlap_range": (overlap_min, overlap_max)
            }


class CacheKeyGenerator:
    """Generate cache keys for various operations."""
    
    @staticmethod
    def search_cache_key(user_id: str, search_params: Dict[str, Any]) -> str:
        """Generate cache key for search results."""
        import hashlib
        import json
        
        # Create deterministic string from search parameters
        params_str = json.dumps(search_params, sort_keys=True)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
        
        return f"search:{user_id}:{params_hash}"
        
    @staticmethod
    def embedding_cache_key(text: str, embedding_type: str) -> str:
        """Generate cache key for embeddings."""
        import hashlib
        
        text_hash = hashlib.md5(text.encode()).hexdigest()[:12]
        return f"embedding:{embedding_type}:{text_hash}"
        
    @staticmethod
    def job_cache_key(job_id: str) -> str:
        """Generate cache key for job data."""
        return f"job:{job_id}"
        
    @staticmethod
    def user_profile_cache_key(user_id: str) -> str:
        """Generate cache key for user profile."""
        return f"profile:{user_id}"


# Global instances
text_processor = TextProcessor()
vector_utils = VectorUtils()
job_matching_utils = JobMatchingUtils()
cache_key_generator = CacheKeyGenerator()