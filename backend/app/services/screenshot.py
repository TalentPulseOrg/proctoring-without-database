import pyautogui
import os
import time
from datetime import datetime
import threading
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScreenshotService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ScreenshotService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.save_folder = "screenshots"
        self.interval = 15
        self.is_running = False
        self.thread = None
        self.current_test_id = None
        self.error_count = 0
        self.max_errors = 3

        # Create folder if it doesn't exist
        try:
            if not os.path.exists(self.save_folder):
                os.makedirs(self.save_folder)
            logger.info(f"Screenshot folder created/verified at: {os.path.abspath(self.save_folder)}")
        except Exception as e:
            logger.error(f"Failed to create screenshot folder: {str(e)}")
            raise

        # Test if we can take a screenshot
        try:
            pyautogui.screenshot()
            logger.info("Successfully tested screenshot capability")
        except Exception as e:
            logger.error(f"Failed to take test screenshot: {str(e)}")
            if sys.platform == 'win32':
                logger.error("On Windows, make sure you're running the application with appropriate permissions")
            elif sys.platform == 'linux':
                logger.error("On Linux, make sure you have X11 forwarding enabled if running remotely")
            raise
            
        self._initialized = True
        logger.info("ScreenshotService initialized successfully")

    def start_for_test(self, test_id):
        """Start screenshot capture for a specific test"""
        try:
            if self.is_running:
                logger.warning(f"Screenshot service is already running for test {self.current_test_id}")
                return False
            
            self.current_test_id = test_id
            self.is_running = True
            self.error_count = 0
            self.thread = threading.Thread(target=self._capture_loop)
            self.thread.daemon = True
            self.thread.start()
            logger.info(f"Started screenshot capture for test {test_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to start screenshot service: {str(e)}")
            return False

    def stop_for_test(self):
        """Stop screenshot capture for the current test"""
        try:
            if not self.is_running:
                logger.warning("Screenshot service is not running")
                return False

            self.is_running = False
            if self.thread:
                self.thread.join()
            test_id = self.current_test_id
            self.current_test_id = None
            logger.info(f"Stopped screenshot capture for test {test_id}")
            return True
        except Exception as e:
            logger.error(f"Error stopping screenshot service: {str(e)}")
            return False

    def is_active(self):
        """Check if the service is currently running"""
        return self.is_running

    def get_current_test_id(self):
        """Get the current test ID being monitored"""
        return self.current_test_id

    def _capture_loop(self):
        while self.is_running:
            try:
                # Generate filename with current timestamp and test ID
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                filename = f"test_{self.current_test_id}_screenshot_{timestamp}.png"
                filepath = os.path.join(self.save_folder, filename)

                # Take screenshot and save it
                screenshot = pyautogui.screenshot()
                screenshot.save(filepath)

                # Reset error count on successful capture
                self.error_count = 0
                logger.debug(f"Saved: {filepath}")

                # Wait for the interval
                time.sleep(self.interval)
            except Exception as e:
                self.error_count += 1
                logger.error(f"Error capturing screenshot: {str(e)}")
                
                if self.error_count >= self.max_errors:
                    logger.error("Too many consecutive errors, stopping screenshot service")
                    self.is_running = False
                    break
                    
                time.sleep(self.interval)  # Still wait before retrying

# Create a singleton instance
screenshot_service = ScreenshotService()
