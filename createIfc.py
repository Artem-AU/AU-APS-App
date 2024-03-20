import os
import sys

try:
    print("Hello, World!")
    print(f"Python version: {sys.version}")
    print(f"Environment variables: {os.environ}")
except Exception as e:
    print(f"Caught exception: {e}")