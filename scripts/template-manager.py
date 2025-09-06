#!/usr/bin/env python3
"""
GoREAL Template Manager

A tool for managing, validating, and maintaining project templates.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List
import subprocess


class TemplateManager:
    """Template management and validation tool"""

    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.templates_dir = self.script_dir.parent / "templates" / "project-templates"
        self.shared_configs_dir = (
            self.script_dir.parent / "templates" / "shared-configs"
        )

    def validate_template(self, template_name: str) -> bool:
        """Validate a template configuration and structure"""
        template_path = self.templates_dir / template_name

        if not template_path.exists():
            print(f"❌ Template directory not found: {template_name}")
            return False

        config_file = template_path / "template.json"
        if not config_file.exists():
            print(f"❌ Template configuration not found: template.json")
            return False

        try:
            with open(config_file) as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in template.json: {e}")
            return False

        # Validate required fields
        required_fields = ["name", "displayName", "description", "version"]
        for field in required_fields:
            if field not in config:
                print(f"❌ Missing required field: {field}")
                return False

        # Validate variables
        variables = config.get("variables", {})
        for var_name, var_config in variables.items():
            if not isinstance(var_config, dict):
                print(f"❌ Variable '{var_name}' must be an object")
                return False

            var_type = var_config.get("type", "string")
            if var_type not in [
                "string",
                "integer",
                "boolean",
                "choice",
                "multiselect",
            ]:
                print(f"❌ Invalid variable type '{var_type}' for '{var_name}'")
                return False

            if var_type in ["choice", "multiselect"] and "choices" not in var_config:
                print(
                    f"❌ Variable '{var_name}' of type '{var_type}' must have 'choices'"
                )
                return False

        # Validate file references
        files_config = config.get("files", {})
        for file_list in files_config.get("copy", []):
            file_path = template_path / file_list
            if not file_path.exists():
                print(f"⚠️  Referenced file not found: {file_list}")

        for template_file in files_config.get("template", []):
            template_file_path = template_path / f"{template_file}.template"
            shared_file = self.find_shared_config_file(template_file)

            if not template_file_path.exists() and not shared_file:
                print(f"⚠️  Template file not found: {template_file}")

        # Validate structure
        structure = config.get("structure", {})
        self.validate_structure(structure, template_path, "")

        print(f"✅ Template '{template_name}' is valid")
        return True

    def validate_structure(
        self, structure: Dict[str, Any], template_path: Path, prefix: str
    ):
        """Validate template structure references"""
        for name, content in structure.items():
            if isinstance(content, dict):
                # Recursive directory
                self.validate_structure(content, template_path, f"{prefix}{name}/")
            elif content == "template":
                # Check if template file exists
                src_file = template_path / "src" / f"{prefix}{name}"
                if not src_file.exists():
                    print(f"⚠️  Structure template file not found: {prefix}{name}")

    def find_shared_config_file(self, file_path: str) -> Path:
        """Find shared configuration file"""
        possible_locations = [
            self.shared_configs_dir / "python" / f"{file_path}.template",
            self.shared_configs_dir / "docker" / f"{file_path}.template",
            self.shared_configs_dir / "github" / "workflows" / f"{file_path}.template",
            self.shared_configs_dir / "env" / f"{file_path}.template",
            self.shared_configs_dir / "git" / f"{file_path}.template",
        ]

        for location in possible_locations:
            if location.exists():
                return location

        return None

    def list_templates(self) -> List[Dict[str, Any]]:
        """List all available templates with their status"""
        templates = []

        for template_dir in self.templates_dir.iterdir():
            if template_dir.is_dir():
                config_file = template_dir / "template.json"

                template_info = {
                    "name": template_dir.name,
                    "path": str(template_dir),
                    "valid": False,
                    "config": None,
                }

                if config_file.exists():
                    try:
                        with open(config_file) as f:
                            config = json.load(f)
                        template_info["config"] = config
                        template_info["valid"] = True
                    except json.JSONDecodeError:
                        pass

                templates.append(template_info)

        return templates

    def create_template_skeleton(
        self, template_name: str, template_type: str = "basic"
    ):
        """Create a new template skeleton"""
        template_path = self.templates_dir / template_name

        if template_path.exists():
            print(f"❌ Template '{template_name}' already exists")
            return False

        # Create directory structure
        template_path.mkdir(parents=True, exist_ok=True)
        (template_path / "src").mkdir(exist_ok=True)
        (template_path / "scripts").mkdir(exist_ok=True)

        # Create basic template.json
        template_config = {
            "name": template_name,
            "displayName": template_name.replace("-", " ").title(),
            "description": f"A {template_type} project template",
            "version": "1.0.0",
            "author": "Template Author",
            "tags": [template_type, "python"],
            "requirements": {"python": ">=3.10"},
            "variables": {
                "project_name": {
                    "type": "string",
                    "description": "Project name (lowercase, hyphens allowed)",
                    "pattern": "^[a-z][a-z0-9-]*[a-z0-9]$",
                    "example": "my-project",
                },
                "project_title": {
                    "type": "string",
                    "description": "Human-readable project title",
                    "example": "My Project",
                },
                "project_description": {
                    "type": "string",
                    "description": "Brief project description",
                    "example": "A sample project",
                },
                "author_name": {
                    "type": "string",
                    "description": "Author name",
                    "example": "Your Name",
                },
                "author_email": {
                    "type": "string",
                    "description": "Contact email",
                    "pattern": "^[^@]+@[^@]+\\\\.[^@]+$",
                    "example": "you@example.com",
                },
            },
            "files": {
                "template": [
                    "README.md",
                    "requirements.txt",
                    ".env.example",
                    ".gitignore",
                ]
            },
            "structure": {
                "{{project_name}}/": {
                    "{{project_name|replace('-', '_')}}/": {"__init__.py": "template"},
                    "tests/": {"__init__.py": "template"},
                }
            },
        }

        # Write template configuration
        with open(template_path / "template.json", "w") as f:
            json.dump(template_config, f, indent=2)

        # Create basic template files
        self.create_basic_template_files(template_path)

        print(f"✅ Template skeleton created: {template_name}")
        print(f"📂 Location: {template_path}")
        print("\n📝 Next steps:")
        print("1. Edit template.json to customize the template configuration")
        print("2. Add template files in the src/ directory")
        print(
            "3. Test the template with: python scripts/create-project.py -t",
            template_name,
        )

        return True

    def create_basic_template_files(self, template_path: Path):
        """Create basic template files"""
        src_dir = template_path / "src"

        # README template
        readme_content = """# {{project_title}}

{{project_description}}

## Installation

```bash
pip install -r requirements.txt
```

## Usage

TODO: Add usage instructions

## License

MIT License
"""
        with open(src_dir / "README.md.template", "w") as f:
            f.write(readme_content)

        # Requirements template
        requirements_content = """# {{project_title}} Dependencies
click>=8.0.0
python-dotenv>=1.0.0
"""
        with open(src_dir / "requirements.txt.template", "w") as f:
            f.write(requirements_content)

        # __init__.py template
        init_content = '''"""{{project_title}}

{{project_description}}
"""

__version__ = "0.1.0"
__author__ = "{{author_name}}"
'''
        with open(src_dir / "__init__.py.template", "w") as f:
            f.write(init_content)

    def test_template(self, template_name: str, output_dir: str = None) -> bool:
        """Test template creation with sample data"""
        if not output_dir:
            output_dir = f"test-{template_name}-output"

        # Sample test data
        test_inputs = {
            "project_name": "test-project",
            "project_title": "Test Project",
            "project_description": "A test project for template validation",
            "author_name": "Test Author",
            "author_email": "test@example.com",
        }

        # Import and use the project creator
        sys.path.insert(0, str(self.script_dir))
        from create_project import ProjectCreator

        creator = ProjectCreator()

        print(f"🧪 Testing template: {template_name}")
        success = creator.create_project(template_name, output_dir, test_inputs)

        if success:
            print(f"✅ Template test successful")
            print(f"📂 Test output: {Path(output_dir).absolute()}")

            # Clean up test output
            cleanup = input("Clean up test output? (Y/n): ").strip().lower()
            if cleanup in ("", "y", "yes"):
                shutil.rmtree(output_dir, ignore_errors=True)
                print("🧹 Test output cleaned up")
        else:
            print(f"❌ Template test failed")

        return success

    def update_template_version(self, template_name: str, new_version: str):
        """Update template version"""
        config_file = self.templates_dir / template_name / "template.json"

        if not config_file.exists():
            print(f"❌ Template not found: {template_name}")
            return False

        with open(config_file) as f:
            config = json.load(f)

        old_version = config.get("version", "unknown")
        config["version"] = new_version

        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)

        print(f"✅ Updated {template_name} version: {old_version} → {new_version}")
        return True

    def lint_all_templates(self) -> bool:
        """Validate all templates"""
        templates = self.list_templates()
        all_valid = True

        print("🔍 Validating all templates...")
        print("=" * 50)

        for template in templates:
            print(f"\n📋 {template['name']}")
            if template["valid"]:
                is_valid = self.validate_template(template["name"])
                if not is_valid:
                    all_valid = False
            else:
                print("❌ Invalid template configuration")
                all_valid = False

        print(
            f"\n{'✅' if all_valid else '❌'} Template validation {'complete' if all_valid else 'failed'}"
        )
        return all_valid

    def export_template(self, template_name: str, output_file: str):
        """Export template as archive"""
        template_path = self.templates_dir / template_name

        if not template_path.exists():
            print(f"❌ Template not found: {template_name}")
            return False

        # Create archive
        archive_path = Path(output_file)
        shutil.make_archive(str(archive_path.with_suffix("")), "zip", template_path)

        print(f"✅ Template exported: {archive_path.with_suffix('.zip')}")
        return True

    def import_template(self, archive_file: str, template_name: str = None):
        """Import template from archive"""
        archive_path = Path(archive_file)

        if not archive_path.exists():
            print(f"❌ Archive not found: {archive_file}")
            return False

        # Extract to temporary directory
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            shutil.unpack_archive(archive_file, temp_dir)

            # Find template.json
            temp_path = Path(temp_dir)
            config_files = list(temp_path.rglob("template.json"))

            if not config_files:
                print("❌ No template.json found in archive")
                return False

            template_dir = config_files[0].parent

            # Load config to get template name
            with open(config_files[0]) as f:
                config = json.load(f)

            if not template_name:
                template_name = config.get("name", archive_path.stem)

            # Copy to templates directory
            dst_path = self.templates_dir / template_name
            if dst_path.exists():
                response = input(
                    f"Template '{template_name}' exists. Overwrite? (y/N): "
                )
                if response.lower() not in ("y", "yes"):
                    print("❌ Import cancelled")
                    return False
                shutil.rmtree(dst_path)

            shutil.copytree(template_dir, dst_path)

        print(f"✅ Template imported: {template_name}")

        # Validate imported template
        return self.validate_template(template_name)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="GoREAL Template Manager")
    parser.add_argument(
        "command",
        choices=[
            "list",
            "validate",
            "create",
            "test",
            "version",
            "lint",
            "export",
            "import",
        ],
        help="Command to execute",
    )

    parser.add_argument("--template", "-t", help="Template name")
    parser.add_argument(
        "--type", help="Template type (for create command)", default="basic"
    )
    parser.add_argument("--version", "-v", help="Version (for version command)")
    parser.add_argument("--output", "-o", help="Output file/directory")
    parser.add_argument("--archive", "-a", help="Archive file (for import command)")

    args = parser.parse_args()

    manager = TemplateManager()

    try:
        if args.command == "list":
            templates = manager.list_templates()
            print("\n📋 Available Templates:")
            print("=" * 70)
            for template in templates:
                status = "✅ Valid" if template["valid"] else "❌ Invalid"
                config = template.get("config", {})
                print(f"\n🏷️  {template['name']} - {status}")
                if config:
                    print(f"   {config.get('displayName', 'Unknown')}")
                    print(f"   {config.get('description', 'No description')}")
                    print(f"   Version: {config.get('version', 'Unknown')}")

        elif args.command == "validate":
            if not args.template:
                print("❌ Template name required for validation")
                sys.exit(1)
            success = manager.validate_template(args.template)
            sys.exit(0 if success else 1)

        elif args.command == "create":
            if not args.template:
                print("❌ Template name required for creation")
                sys.exit(1)
            success = manager.create_template_skeleton(args.template, args.type)
            sys.exit(0 if success else 1)

        elif args.command == "test":
            if not args.template:
                print("❌ Template name required for testing")
                sys.exit(1)
            success = manager.test_template(args.template, args.output)
            sys.exit(0 if success else 1)

        elif args.command == "version":
            if not args.template or not args.version:
                print("❌ Template name and version required")
                sys.exit(1)
            success = manager.update_template_version(args.template, args.version)
            sys.exit(0 if success else 1)

        elif args.command == "lint":
            success = manager.lint_all_templates()
            sys.exit(0 if success else 1)

        elif args.command == "export":
            if not args.template or not args.output:
                print("❌ Template name and output file required")
                sys.exit(1)
            success = manager.export_template(args.template, args.output)
            sys.exit(0 if success else 1)

        elif args.command == "import":
            if not args.archive:
                print("❌ Archive file required for import")
                sys.exit(1)
            success = manager.import_template(args.archive, args.template)
            sys.exit(0 if success else 1)

    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
