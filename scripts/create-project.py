#!/usr/bin/env python3
"""
GoREAL Project Creation Script

A comprehensive project scaffolding tool that creates new projects from templates.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
import secrets
import string


class ProjectCreator:
    """Main project creation class"""
    
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.templates_dir = self.script_dir.parent / "templates" / "project-templates"
        self.shared_configs_dir = self.script_dir.parent / "templates" / "shared-configs"
        
    def list_templates(self) -> List[Dict[str, Any]]:
        """List all available project templates"""
        templates = []
        
        for template_dir in self.templates_dir.iterdir():
            if template_dir.is_dir() and (template_dir / "template.json").exists():
                with open(template_dir / "template.json") as f:
                    template_config = json.load(f)
                    template_config["path"] = str(template_dir)
                    templates.append(template_config)
        
        return templates
    
    def load_template_config(self, template_name: str) -> Dict[str, Any]:
        """Load template configuration"""
        template_path = self.templates_dir / template_name / "template.json"
        
        if not template_path.exists():
            raise ValueError(f"Template '{template_name}' not found")
        
        with open(template_path) as f:
            return json.load(f)
    
    def validate_inputs(self, template_config: Dict[str, Any], inputs: Dict[str, Any]) -> bool:
        """Validate user inputs against template requirements"""
        variables = template_config.get("variables", {})
        
        for var_name, var_config in variables.items():
            if var_name not in inputs:
                if "default" not in var_config:
                    print(f"❌ Required variable '{var_name}' not provided")
                    return False
                inputs[var_name] = var_config["default"]
            
            value = inputs[var_name]
            var_type = var_config.get("type", "string")
            
            # Type validation
            if var_type == "integer":
                try:
                    inputs[var_name] = int(value)
                except ValueError:
                    print(f"❌ Variable '{var_name}' must be an integer")
                    return False
                    
                # Range validation
                if "min" in var_config and inputs[var_name] < var_config["min"]:
                    print(f"❌ Variable '{var_name}' must be >= {var_config['min']}")
                    return False
                if "max" in var_config and inputs[var_name] > var_config["max"]:
                    print(f"❌ Variable '{var_name}' must be <= {var_config['max']}")
                    return False
            
            elif var_type == "boolean":
                if isinstance(value, str):
                    inputs[var_name] = value.lower() in ("true", "yes", "1", "on")
            
            elif var_type == "choice":
                choices = var_config.get("choices", [])
                if value not in choices:
                    print(f"❌ Variable '{var_name}' must be one of: {', '.join(choices)}")
                    return False
            
            elif var_type == "multiselect":
                choices = var_config.get("choices", [])
                if isinstance(value, str):
                    value = [v.strip() for v in value.split(",")]
                for v in value:
                    if v not in choices:
                        print(f"❌ Variable '{var_name}' contains invalid choice: {v}")
                        return False
                inputs[var_name] = value
            
            # Pattern validation
            if "pattern" in var_config and var_type == "string":
                if not re.match(var_config["pattern"], str(value)):
                    print(f"❌ Variable '{var_name}' doesn't match required pattern")
                    return False
        
        return True
    
    def collect_inputs_interactive(self, template_config: Dict[str, Any]) -> Dict[str, Any]:
        """Collect inputs interactively from user"""
        inputs = {}
        variables = template_config.get("variables", {})
        
        print(f"\n📝 Configuration for {template_config['displayName']}")
        print("=" * 50)
        
        for var_name, var_config in variables.items():
            var_type = var_config.get("type", "string")
            description = var_config.get("description", var_name)
            default = var_config.get("default")
            example = var_config.get("example")
            
            prompt = f"{description}"
            if example:
                prompt += f" (e.g., {example})"
            if default is not None:
                prompt += f" [{default}]"
            
            if var_type == "choice":
                choices = var_config.get("choices", [])
                prompt += f"\nChoices: {', '.join(choices)}"
            elif var_type == "multiselect":
                choices = var_config.get("choices", [])
                prompt += f"\nChoices (comma-separated): {', '.join(choices)}"
            elif var_type == "boolean":
                prompt += " (y/n)"
            
            prompt += ": "
            
            while True:
                try:
                    value = input(prompt).strip()
                    
                    if not value and default is not None:
                        value = default
                        break
                    elif not value:
                        print("❌ This field is required")
                        continue
                    
                    # Type-specific validation
                    if var_type == "boolean":
                        value = value.lower() in ("y", "yes", "true", "1", "on")
                        break
                    elif var_type == "integer":
                        value = int(value)
                        min_val = var_config.get("min")
                        max_val = var_config.get("max")
                        if min_val is not None and value < min_val:
                            print(f"❌ Value must be >= {min_val}")
                            continue
                        if max_val is not None and value > max_val:
                            print(f"❌ Value must be <= {max_val}")
                            continue
                        break
                    elif var_type == "choice":
                        choices = var_config.get("choices", [])
                        if value not in choices:
                            print(f"❌ Must be one of: {', '.join(choices)}")
                            continue
                        break
                    elif var_type == "multiselect":
                        choices = var_config.get("choices", [])
                        values = [v.strip() for v in value.split(",")]
                        invalid = [v for v in values if v not in choices]
                        if invalid:
                            print(f"❌ Invalid choices: {', '.join(invalid)}")
                            continue
                        value = values
                        break
                    else:
                        # String validation
                        if "pattern" in var_config:
                            if not re.match(var_config["pattern"], value):
                                print(f"❌ Invalid format. Please check the example.")
                                continue
                        break
                        
                except ValueError:
                    print("❌ Invalid input. Please try again.")
                    continue
            
            inputs[var_name] = value
        
        return inputs
    
    def render_template_string(self, template_str: str, variables: Dict[str, Any]) -> str:
        """Render a template string with variables"""
        # Simple template rendering - replace {{variable}} with values
        for var_name, value in variables.items():
            # Handle filters like {{project_name|replace('-', '_')}}
            pattern = rf'\{{\{{\s*{re.escape(var_name)}\s*(\|[^}}]+)?\s*\}}\}}'
            
            def replace_func(match):
                filter_expr = match.group(1)
                if filter_expr:
                    # Simple filter processing
                    if "|replace" in filter_expr:
                        # Extract replace parameters
                        filter_match = re.search(r'\|replace\([\'"]([^\'"]*)[\'"],\s*[\'"]([^\'"]*)[\'"]\)', filter_expr)
                        if filter_match:
                            old, new = filter_match.groups()
                            return str(value).replace(old, new)
                    elif "|title" in filter_expr:
                        return str(value).title()
                    elif "|lower" in filter_expr:
                        return str(value).lower()
                    elif "|upper" in filter_expr:
                        return str(value).upper()
                
                return str(value)
            
            template_str = re.sub(pattern, replace_func, template_str)
        
        return template_str
    
    def process_template_file(self, src_path: Path, dst_path: Path, variables: Dict[str, Any]):
        """Process a single template file"""
        if src_path.suffix == ".template":
            # Remove .template extension from destination
            dst_path = dst_path.with_suffix("")
            
            # Read and render template
            with open(src_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            rendered_content = self.render_template_string(content, variables)
            
            # Write rendered content
            with open(dst_path, 'w', encoding='utf-8') as f:
                f.write(rendered_content)
        else:
            # Copy file as-is
            shutil.copy2(src_path, dst_path)
    
    def create_project_structure(self, template_dir: Path, output_dir: Path, 
                                template_config: Dict[str, Any], variables: Dict[str, Any]):
        """Create the project directory structure"""
        
        # Process template structure
        structure = template_config.get("structure", {})
        
        def create_structure_recursive(struct: Dict[str, Any], base_path: Path):
            for name, content in struct.items():
                # Render directory/file names with variables
                rendered_name = self.render_template_string(name, variables)
                current_path = base_path / rendered_name
                
                if isinstance(content, dict):
                    # It's a directory
                    current_path.mkdir(parents=True, exist_ok=True)
                    create_structure_recursive(content, current_path)
                elif content == "template":
                    # It's a template file
                    template_file = template_dir / "src" / name
                    if template_file.exists():
                        self.process_template_file(template_file, current_path, variables)
                    else:
                        # Create empty file
                        current_path.touch()
                else:
                    # It's a regular file
                    template_file = template_dir / content if content else template_dir / "src" / name
                    if template_file.exists():
                        if template_file.suffix == ".template" or "template" in content:
                            self.process_template_file(template_file, current_path, variables)
                        else:
                            shutil.copy2(template_file, current_path)
                    else:
                        current_path.touch()
        
        create_structure_recursive(structure, output_dir)
        
        # Copy additional files specified in template config
        files_config = template_config.get("files", {})
        
        # Copy regular files
        for file_pattern in files_config.get("copy", []):
            src_pattern = template_dir / file_pattern
            if src_pattern.exists():
                if src_pattern.is_file():
                    dst_file = output_dir / src_pattern.name
                    shutil.copy2(src_pattern, dst_file)
                else:
                    dst_dir = output_dir / src_pattern.name
                    shutil.copytree(src_pattern, dst_dir, dirs_exist_ok=True)
        
        # Process template files
        for template_file in files_config.get("template", []):
            src_file = template_dir / f"{template_file}.template"
            if src_file.exists():
                dst_file = output_dir / template_file
                dst_file.parent.mkdir(parents=True, exist_ok=True)
                self.process_template_file(src_file, dst_file, variables)
            else:
                # Try shared configs
                shared_file = self.find_shared_config_file(template_file)
                if shared_file:
                    dst_file = output_dir / template_file
                    dst_file.parent.mkdir(parents=True, exist_ok=True)
                    self.process_template_file(shared_file, dst_file, variables)
        
        # Process conditional files
        conditional_files = files_config.get("conditional", {})
        for condition, file_list in conditional_files.items():
            if self.evaluate_condition(condition, variables):
                for file_path in file_list:
                    src_file = template_dir / file_path
                    if src_file.exists():
                        dst_file = output_dir / file_path
                        dst_file.parent.mkdir(parents=True, exist_ok=True)
                        if src_file.suffix == ".template":
                            self.process_template_file(src_file, dst_file, variables)
                        else:
                            shutil.copy2(src_file, dst_file)
    
    def find_shared_config_file(self, file_path: str) -> Optional[Path]:
        """Find a shared configuration file"""
        # Check various shared config locations
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
    
    def evaluate_condition(self, condition: str, variables: Dict[str, Any]) -> bool:
        """Evaluate a conditional expression"""
        if ":" in condition:
            var_name, expected_value = condition.split(":", 1)
            return str(variables.get(var_name)) == expected_value
        else:
            # Boolean variable
            return bool(variables.get(condition, False))
    
    def generate_secrets(self, variables: Dict[str, Any]) -> Dict[str, str]:
        """Generate secure secrets for the project"""
        secrets_map = {}
        
        # Generate secret key
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        secrets_map["SECRET_KEY"] = ''.join(secrets.choice(alphabet) for _ in range(32))
        
        # Generate JWT secret if needed
        if variables.get("use_jwt_auth"):
            secrets_map["JWT_SECRET_KEY"] = ''.join(secrets.choice(alphabet) for _ in range(32))
        
        # Generate database password
        db_alphabet = string.ascii_letters + string.digits
        secrets_map["DB_PASSWORD"] = ''.join(secrets.choice(db_alphabet) for _ in range(16))
        
        if variables.get("use_redis"):
            secrets_map["REDIS_PASSWORD"] = ''.join(secrets.choice(db_alphabet) for _ in range(16))
        
        return secrets_map
    
    def run_post_create_hooks(self, output_dir: Path, template_config: Dict[str, Any], variables: Dict[str, Any]):
        """Run post-creation hooks"""
        hooks = template_config.get("hooks", {})
        
        # Pre-create hooks
        for hook in hooks.get("pre_create", []):
            self.run_hook(hook, output_dir, variables)
        
        # Post-create hooks
        for hook in hooks.get("post_create", []):
            self.run_hook(hook, output_dir, variables)
    
    def run_hook(self, hook: str, output_dir: Path, variables: Dict[str, Any]):
        """Run a single hook"""
        print(f"🔧 Running hook: {hook}")
        
        try:
            if hook.endswith(".py"):
                # Python script
                result = subprocess.run([sys.executable, hook], 
                                      cwd=output_dir, check=True, capture_output=True, text=True)
            elif hook.endswith(".sh"):
                # Bash script
                result = subprocess.run(["bash", hook], 
                                      cwd=output_dir, check=True, capture_output=True, text=True)
            else:
                # Direct command
                result = subprocess.run(hook.split(), 
                                      cwd=output_dir, check=True, capture_output=True, text=True)
            
            if result.stdout:
                print(f"   {result.stdout.strip()}")
                
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Hook failed: {e}")
            if e.stderr:
                print(f"   Error: {e.stderr.strip()}")
    
    def create_project(self, template_name: str, output_dir: str, inputs: Optional[Dict[str, Any]] = None) -> bool:
        """Create a new project from template"""
        
        # Load template configuration
        try:
            template_config = self.load_template_config(template_name)
        except ValueError as e:
            print(f"❌ {e}")
            return False
        
        template_dir = self.templates_dir / template_name
        output_path = Path(output_dir)
        
        # Check if output directory already exists
        if output_path.exists() and any(output_path.iterdir()):
            response = input(f"⚠️  Directory '{output_dir}' already exists and is not empty. Continue? (y/N): ")
            if response.lower() not in ("y", "yes"):
                print("❌ Project creation cancelled")
                return False
        
        # Collect inputs
        if inputs is None:
            inputs = self.collect_inputs_interactive(template_config)
        
        # Validate inputs
        if not self.validate_inputs(template_config, inputs):
            return False
        
        # Add template type to variables
        inputs["template_type"] = template_name
        
        # Generate secrets
        secrets = self.generate_secrets(inputs)
        inputs.update(secrets)
        
        # Create output directory
        output_path.mkdir(parents=True, exist_ok=True)
        
        try:
            print(f"\n🚀 Creating project from '{template_config['displayName']}' template...")
            
            # Create project structure
            self.create_project_structure(template_dir, output_path, template_config, inputs)
            
            # Run post-creation hooks
            self.run_post_create_hooks(output_path, template_config, inputs)
            
            # Initialize git repository
            if shutil.which("git"):
                subprocess.run(["git", "init"], cwd=output_path, check=False, capture_output=True)
                subprocess.run(["git", "add", "."], cwd=output_path, check=False, capture_output=True)
                subprocess.run(["git", "commit", "-m", "Initial commit from template"], 
                             cwd=output_path, check=False, capture_output=True)
                print("✅ Git repository initialized")
            
            print(f"\n🎉 Project '{inputs.get('project_name')}' created successfully!")
            print(f"📂 Location: {output_path.absolute()}")
            
            # Show next steps
            self.show_next_steps(template_config, inputs, output_path)
            
            return True
            
        except Exception as e:
            print(f"❌ Error creating project: {e}")
            return False
    
    def show_next_steps(self, template_config: Dict[str, Any], variables: Dict[str, Any], output_path: Path):
        """Show next steps after project creation"""
        print(f"\n📋 Next Steps:")
        print("=" * 30)
        
        # Template-specific steps
        post_steps = template_config.get("post_create_steps", [])
        for i, step in enumerate(post_steps, 1):
            print(f"{i}. {step}")
        
        # Generic steps
        if not post_steps:
            print("1. Review and update the .env file with your specific configuration")
            print("2. Install dependencies:")
            if (output_path / "requirements.txt").exists():
                print("   pip install -r requirements.txt")
            if (output_path / "requirements-dev.txt").exists():
                print("   pip install -r requirements-dev.txt")
            
            if variables.get("use_docker"):
                print("3. Start with Docker: docker-compose up -d")
            else:
                print("3. Run the application:")
                if template_config.get("name") == "flask-api":
                    print(f"   flask --app {variables['project_name'].replace('-', '_')}.api.app:create_app() run")
                elif template_config.get("name") == "streamlit-dashboard":
                    print("   streamlit run app.py")
        
        print(f"\n📚 Documentation: {output_path / 'README.md'}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="GoREAL Project Creation Tool")
    parser.add_argument("--list", action="store_true", help="List available templates")
    parser.add_argument("--template", "-t", help="Template name")
    parser.add_argument("--output", "-o", help="Output directory", default=".")
    parser.add_argument("--config", "-c", help="Configuration file (JSON)")
    
    args = parser.parse_args()
    
    creator = ProjectCreator()
    
    if args.list:
        templates = creator.list_templates()
        print("\n📋 Available Templates:")
        print("=" * 50)
        for template in templates:
            print(f"\n🏷️  {template['name']}")
            print(f"   {template['displayName']}")
            print(f"   {template['description']}")
            print(f"   Tags: {', '.join(template.get('tags', []))}")
        print("\n")
        return
    
    if not args.template:
        # Interactive template selection
        templates = creator.list_templates()
        print("\n📋 Available Templates:")
        for i, template in enumerate(templates, 1):
            print(f"{i}. {template['displayName']} ({template['name']})")
            print(f"   {template['description']}")
        
        while True:
            try:
                choice = input(f"\nSelect template (1-{len(templates)}): ").strip()
                template_idx = int(choice) - 1
                if 0 <= template_idx < len(templates):
                    template_name = templates[template_idx]['name']
                    break
                else:
                    print("❌ Invalid choice. Please try again.")
            except ValueError:
                print("❌ Please enter a number.")
    else:
        template_name = args.template
    
    # Load configuration if provided
    config_inputs = None
    if args.config:
        with open(args.config) as f:
            config_inputs = json.load(f)
    
    # Determine output directory
    if config_inputs and "project_name" in config_inputs:
        output_dir = args.output if args.output != "." else config_inputs["project_name"]
    else:
        output_dir = args.output
    
    # Create project
    success = creator.create_project(template_name, output_dir, config_inputs)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()