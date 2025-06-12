# This file is intentionally empty as we're using FastAPI
# All routes are registered in main.py
# -*- coding: utf-8 -*-

__author__ = """Your Name"""
__email__ = 'your.email@example.com'
__version__ = '0.1.0'

# Simplified model location functions that don't use pkg_resources
import os

def pose_predictor_model_location():
    return os.path.join(os.path.dirname(__file__), "models", "shape_predictor_68_face_landmarks.dat")

def pose_predictor_five_point_model_location():
    return os.path.join(os.path.dirname(__file__), "models", "shape_predictor_5_face_landmarks.dat")

def face_recognition_model_location():
    return os.path.join(os.path.dirname(__file__), "models", "dlib_face_recognition_resnet_model_v1.dat")

def cnn_face_detector_model_location():
    return os.path.join(os.path.dirname(__file__), "models", "mmod_human_face_detector.dat")

