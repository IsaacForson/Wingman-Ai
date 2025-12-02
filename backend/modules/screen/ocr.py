"""
Wingman AI - OCR Processor
Text extraction from images using Tesseract or EasyOCR
"""

import asyncio
from typing import Dict, Any, Optional, Literal
from loguru import logger

try:
    from PIL import Image
except ImportError:
    Image = None


class OCRProcessor:
    """
    OCR text extraction from screenshots
    Supports Tesseract and EasyOCR engines
    """
    
    def __init__(self, engine: Literal["tesseract", "easyocr"] = "tesseract"):
        self.engine = engine
        self._tesseract_available = False
        self._easyocr_reader = None
        
        self._init_engine()
    
    def _init_engine(self):
        """Initialize the OCR engine"""
        if self.engine == "tesseract":
            self._init_tesseract()
        else:
            self._init_easyocr()
    
    def _init_tesseract(self):
        """Initialize Tesseract OCR"""
        try:
            import pytesseract
            # Test if tesseract is installed
            pytesseract.get_tesseract_version()
            self._tesseract_available = True
            logger.info("Tesseract OCR initialized")
        except Exception as e:
            logger.warning(f"Tesseract not available: {e}")
            # Try EasyOCR as fallback
            self._init_easyocr()
    
    def _init_easyocr(self):
        """Initialize EasyOCR"""
        try:
            import easyocr
            self._easyocr_reader = easyocr.Reader(['en'], gpu=False)
            logger.info("EasyOCR initialized")
        except Exception as e:
            logger.error(f"EasyOCR initialization failed: {e}")
    
    async def extract_text(self, image: Image.Image) -> Dict[str, Any]:
        """
        Extract text from an image
        
        Args:
            image: PIL Image to process
            
        Returns:
            Dict with extracted text and metadata
        """
        if image is None:
            return {"text": "", "confidence": 0}
        
        # Run OCR in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        
        if self._tesseract_available:
            result = await loop.run_in_executor(
                None,
                self._extract_tesseract,
                image
            )
        elif self._easyocr_reader:
            result = await loop.run_in_executor(
                None,
                self._extract_easyocr,
                image
            )
        else:
            result = {"text": "", "confidence": 0, "error": "No OCR engine available"}
        
        return result
    
    def _extract_tesseract(self, image: Image.Image) -> Dict[str, Any]:
        """Extract text using Tesseract"""
        try:
            import pytesseract
            
            # Preprocess image for better OCR
            processed = self._preprocess_image(image)
            
            # Get text with confidence data
            data = pytesseract.image_to_data(
                processed,
                output_type=pytesseract.Output.DICT
            )
            
            # Combine text
            text_parts = []
            confidences = []
            
            for i, word in enumerate(data['text']):
                if word.strip():
                    text_parts.append(word)
                    conf = data['conf'][i]
                    if conf > 0:
                        confidences.append(conf)
            
            text = ' '.join(text_parts)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                "text": text,
                "confidence": avg_confidence / 100,
                "word_count": len(text_parts),
                "engine": "tesseract"
            }
            
        except Exception as e:
            logger.error(f"Tesseract extraction error: {e}")
            return {"text": "", "confidence": 0, "error": str(e)}
    
    def _extract_easyocr(self, image: Image.Image) -> Dict[str, Any]:
        """Extract text using EasyOCR"""
        try:
            import numpy as np
            
            # Convert PIL to numpy array
            img_array = np.array(image)
            
            # Run OCR
            results = self._easyocr_reader.readtext(img_array)
            
            # Combine results
            text_parts = []
            confidences = []
            
            for bbox, text, conf in results:
                if text.strip():
                    text_parts.append(text)
                    confidences.append(conf)
            
            text = ' '.join(text_parts)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                "text": text,
                "confidence": avg_confidence,
                "word_count": len(text_parts),
                "engine": "easyocr"
            }
            
        except Exception as e:
            logger.error(f"EasyOCR extraction error: {e}")
            return {"text": "", "confidence": 0, "error": str(e)}
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR results
        """
        try:
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to grayscale
            gray = image.convert('L')
            
            # Increase contrast
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Contrast(gray)
            enhanced = enhancer.enhance(1.5)
            
            # Scale up if too small
            width, height = enhanced.size
            if width < 1000 or height < 500:
                scale = max(1000 / width, 500 / height)
                new_size = (int(width * scale), int(height * scale))
                enhanced = enhanced.resize(new_size, Image.Resampling.LANCZOS)
            
            return enhanced
            
        except Exception as e:
            logger.debug(f"Image preprocessing failed: {e}")
            return image
    
    async def extract_from_region(
        self,
        image: Image.Image,
        x: int,
        y: int,
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Extract text from a specific region of an image"""
        try:
            region = image.crop((x, y, x + width, y + height))
            return await self.extract_text(region)
        except Exception as e:
            logger.error(f"Region extraction error: {e}")
            return {"text": "", "confidence": 0, "error": str(e)}

