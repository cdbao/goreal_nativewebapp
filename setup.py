"""
GoREAL Project - Setup Script
Installation and packaging configuration for the GoREAL project.
"""

from setuptools import setup, find_packages
import os


# Read the contents of README file
def read_file(filename):
    """Read file contents."""
    with open(os.path.join(os.path.dirname(__file__), filename), encoding="utf-8") as f:
        return f.read()


setup(
    name="goreal-project",
    version="1.0.0",
    author="GoREAL Team",
    author_email="goreal@example.com",
    description="A Roblox-integrated challenge management system",
    long_description=read_file("README.md"),
    long_description_content_type="text/markdown",
    url="https://github.com/goreal/goreal-project",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "flask>=2.3.0",
        "streamlit>=1.28.0",
        "pandas>=2.1.0",
        "gspread>=5.12.0",
        "google-auth>=2.23.0",
        "google-auth-oauthlib>=1.1.0",
        "google-auth-httplib2>=0.1.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-cov>=4.1.0",
            "black>=23.11.0",
            "flake8>=6.1.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "goreal-api=goreal.api.app:main",
            "goreal-dashboard=goreal.dashboard.app:main",
        ],
    },
    include_package_data=True,
    package_data={
        "goreal": ["config/*.json"],
    },
)
