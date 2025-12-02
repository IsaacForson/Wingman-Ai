"""
Wingman AI - Speaker Identification
Basic speaker diarization and identification
"""

import asyncio
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from collections import defaultdict
import numpy as np
from loguru import logger


@dataclass
class SpeakerProfile:
    """A speaker profile with voice characteristics"""
    id: str
    name: str
    embeddings: List[np.ndarray] = field(default_factory=list)
    total_speaking_time: float = 0.0
    word_count: int = 0
    
    def add_embedding(self, embedding: np.ndarray):
        """Add a voice embedding sample"""
        self.embeddings.append(embedding)
        # Keep only recent embeddings for efficiency
        if len(self.embeddings) > 10:
            self.embeddings = self.embeddings[-10:]


@dataclass
class SpeakerSegment:
    """A segment of speech attributed to a speaker"""
    speaker_id: str
    speaker_name: str
    start_time: float
    end_time: float
    text: str
    confidence: float


class SpeakerIdentifier:
    """
    Basic speaker identification using voice characteristics
    Uses simple energy-based segmentation and embedding comparison
    """
    
    def __init__(self):
        self._speakers: Dict[str, SpeakerProfile] = {}
        self._current_speaker: Optional[str] = None
        self._embedding_model = None
        self._initialized = False
        
        # Voice characteristics thresholds
        self._silence_threshold = 0.01
        self._min_segment_duration = 0.5  # seconds
        self._speaker_change_threshold = 0.7
    
    async def initialize(self):
        """Initialize the speaker identifier"""
        try:
            # Try to load a simple embedding model
            # In production, use speechbrain or pyannote.audio
            self._initialized = True
            logger.info("Speaker identifier initialized (basic mode)")
        except Exception as e:
            logger.warning(f"Speaker ID initialization failed, using fallback: {e}")
            self._initialized = True
    
    def register_speaker(self, speaker_id: str, name: str) -> SpeakerProfile:
        """Register a new speaker"""
        if speaker_id not in self._speakers:
            self._speakers[speaker_id] = SpeakerProfile(
                id=speaker_id,
                name=name
            )
            logger.debug(f"Registered speaker: {name}")
        return self._speakers[speaker_id]
    
    def get_or_create_speaker(self, name: str) -> SpeakerProfile:
        """Get existing speaker or create new one"""
        # Check if speaker with this name exists
        for speaker in self._speakers.values():
            if speaker.name.lower() == name.lower():
                return speaker
        
        # Create new speaker
        speaker_id = f"speaker_{len(self._speakers) + 1}"
        return self.register_speaker(speaker_id, name)
    
    async def identify_speaker(
        self,
        audio_chunk: np.ndarray,
        sample_rate: int = 16000
    ) -> Optional[str]:
        """
        Identify speaker from audio chunk
        
        Args:
            audio_chunk: Audio data as numpy array
            sample_rate: Audio sample rate
            
        Returns:
            Speaker ID or None if uncertain
        """
        if not self._initialized:
            return None
        
        # Basic energy-based detection
        energy = np.sqrt(np.mean(audio_chunk ** 2))
        
        if energy < self._silence_threshold:
            return None  # Silence
        
        # If no speakers registered, create "Speaker 1"
        if not self._speakers:
            speaker = self.register_speaker("speaker_1", "Speaker 1")
            return speaker.id
        
        # Simple heuristic: if only 2 speakers, alternate based on energy patterns
        # In production, use proper speaker embeddings
        
        # Extract basic features
        features = self._extract_basic_features(audio_chunk, sample_rate)
        
        # Find best matching speaker
        best_match = None
        best_score = 0
        
        for speaker_id, speaker in self._speakers.items():
            score = self._compute_similarity(features, speaker)
            if score > best_score:
                best_score = score
                best_match = speaker_id
        
        # If no good match, create new speaker
        if best_score < self._speaker_change_threshold:
            new_id = f"speaker_{len(self._speakers) + 1}"
            self.register_speaker(new_id, f"Speaker {len(self._speakers) + 1}")
            return new_id
        
        return best_match
    
    def _extract_basic_features(
        self,
        audio: np.ndarray,
        sample_rate: int
    ) -> Dict[str, float]:
        """Extract basic audio features"""
        features = {}
        
        # Energy
        features['energy'] = float(np.sqrt(np.mean(audio ** 2)))
        
        # Zero crossing rate (rough pitch indicator)
        zero_crossings = np.sum(np.abs(np.diff(np.sign(audio)))) / 2
        features['zcr'] = zero_crossings / len(audio)
        
        # Spectral centroid (brightness)
        if len(audio) > 0:
            fft = np.abs(np.fft.rfft(audio))
            freqs = np.fft.rfftfreq(len(audio), 1/sample_rate)
            if np.sum(fft) > 0:
                features['spectral_centroid'] = float(np.sum(freqs * fft) / np.sum(fft))
            else:
                features['spectral_centroid'] = 0.0
        else:
            features['spectral_centroid'] = 0.0
        
        return features
    
    def _compute_similarity(
        self,
        features: Dict[str, float],
        speaker: SpeakerProfile
    ) -> float:
        """Compute similarity between features and speaker profile"""
        # Simple similarity based on stored characteristics
        # In production, use proper embedding comparison
        
        if not speaker.embeddings:
            return 0.5  # Neutral score for new speakers
        
        # Use last features as reference
        ref_features = speaker.embeddings[-1] if isinstance(speaker.embeddings[-1], dict) else {}
        
        if not ref_features:
            return 0.5
        
        # Compare each feature
        similarities = []
        for key in features:
            if key in ref_features:
                diff = abs(features[key] - ref_features[key])
                max_val = max(abs(features[key]), abs(ref_features[key]), 1e-6)
                similarity = 1 - min(diff / max_val, 1)
                similarities.append(similarity)
        
        return np.mean(similarities) if similarities else 0.5
    
    def update_speaker_profile(
        self,
        speaker_id: str,
        audio_chunk: np.ndarray,
        sample_rate: int,
        text: str = ""
    ):
        """Update speaker profile with new audio sample"""
        if speaker_id not in self._speakers:
            return
        
        speaker = self._speakers[speaker_id]
        
        # Store features as embedding
        features = self._extract_basic_features(audio_chunk, sample_rate)
        speaker.embeddings.append(features)
        
        # Update word count
        if text:
            speaker.word_count += len(text.split())
        
        # Update speaking time
        duration = len(audio_chunk) / sample_rate
        speaker.total_speaking_time += duration
    
    async def diarize_audio(
        self,
        audio: np.ndarray,
        sample_rate: int = 16000,
        window_size: float = 1.0
    ) -> List[SpeakerSegment]:
        """
        Perform speaker diarization on audio
        
        Args:
            audio: Full audio as numpy array
            sample_rate: Audio sample rate
            window_size: Window size in seconds for analysis
            
        Returns:
            List of speaker segments
        """
        segments = []
        window_samples = int(window_size * sample_rate)
        
        current_speaker = None
        segment_start = 0
        segment_text = ""
        
        for i in range(0, len(audio), window_samples):
            chunk = audio[i:i + window_samples]
            if len(chunk) < window_samples * 0.5:
                continue
            
            speaker_id = await self.identify_speaker(chunk, sample_rate)
            
            if speaker_id != current_speaker:
                # Save previous segment
                if current_speaker is not None:
                    end_time = i / sample_rate
                    if end_time - segment_start >= self._min_segment_duration:
                        speaker_name = self._speakers.get(current_speaker, SpeakerProfile(id=current_speaker, name="Unknown")).name
                        segments.append(SpeakerSegment(
                            speaker_id=current_speaker,
                            speaker_name=speaker_name,
                            start_time=segment_start,
                            end_time=end_time,
                            text=segment_text,
                            confidence=0.7
                        ))
                
                # Start new segment
                current_speaker = speaker_id
                segment_start = i / sample_rate
                segment_text = ""
        
        # Save final segment
        if current_speaker is not None:
            end_time = len(audio) / sample_rate
            if end_time - segment_start >= self._min_segment_duration:
                speaker_name = self._speakers.get(current_speaker, SpeakerProfile(id=current_speaker, name="Unknown")).name
                segments.append(SpeakerSegment(
                    speaker_id=current_speaker,
                    speaker_name=speaker_name,
                    start_time=segment_start,
                    end_time=end_time,
                    text=segment_text,
                    confidence=0.7
                ))
        
        return segments
    
    def get_speaker_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all speakers"""
        stats = {}
        
        total_time = sum(s.total_speaking_time for s in self._speakers.values())
        
        for speaker_id, speaker in self._speakers.items():
            stats[speaker_id] = {
                "name": speaker.name,
                "total_speaking_time": round(speaker.total_speaking_time, 2),
                "word_count": speaker.word_count,
                "speaking_percentage": round(
                    (speaker.total_speaking_time / total_time * 100) if total_time > 0 else 0, 1
                )
            }
        
        return stats
    
    def get_speakers(self) -> List[Dict[str, Any]]:
        """Get list of all speakers"""
        return [
            {
                "id": speaker.id,
                "name": speaker.name,
                "speaking_time": speaker.total_speaking_time,
                "word_count": speaker.word_count
            }
            for speaker in self._speakers.values()
        ]
    
    def rename_speaker(self, speaker_id: str, new_name: str):
        """Rename a speaker"""
        if speaker_id in self._speakers:
            self._speakers[speaker_id].name = new_name
            logger.debug(f"Renamed speaker {speaker_id} to {new_name}")
    
    def reset(self):
        """Reset all speaker data"""
        self._speakers.clear()
        self._current_speaker = None
        logger.debug("Speaker identifier reset")

