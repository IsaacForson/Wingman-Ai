"""
Wingman AI - Plugin System
Custom plugin support for extending functionality
"""

import asyncio
import importlib
import importlib.util
import os
from typing import Optional, Dict, Any, List, Callable, Type
from pathlib import Path
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
from loguru import logger


@dataclass
class PluginMetadata:
    """Plugin metadata"""
    name: str
    version: str
    description: str
    author: str
    dependencies: List[str] = field(default_factory=list)
    settings_schema: Dict[str, Any] = field(default_factory=dict)


class WingmanPlugin(ABC):
    """
    Base class for Wingman plugins
    All plugins must inherit from this class
    """
    
    metadata: PluginMetadata
    
    def __init__(self, engine=None):
        self.engine = engine
        self.enabled = False
        self.settings: Dict[str, Any] = {}
    
    @abstractmethod
    async def initialize(self) -> bool:
        """
        Initialize the plugin
        Return True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def shutdown(self):
        """Cleanup and shutdown the plugin"""
        pass
    
    async def on_question(self, question: str, source: str, mode: str) -> Optional[str]:
        """
        Hook called when a question is detected
        Return a modified question or None to use original
        """
        return None
    
    async def on_answer(self, question: str, answer: str) -> Optional[str]:
        """
        Hook called when an answer is generated
        Return a modified answer or None to use original
        """
        return None
    
    async def on_transcript(self, text: str, is_final: bool) -> Optional[str]:
        """
        Hook called when transcript is received
        Return modified text or None to use original
        """
        return None
    
    async def on_screen_capture(self, text: str, content_type: str) -> Optional[str]:
        """
        Hook called when screen content is captured
        Return modified text or None to use original
        """
        return None
    
    async def on_mode_change(self, old_mode: str, new_mode: str):
        """Hook called when operating mode changes"""
        pass
    
    async def on_session_start(self, session_id: str):
        """Hook called when a session starts"""
        pass
    
    async def on_session_end(self, session_id: str):
        """Hook called when a session ends"""
        pass
    
    def get_commands(self) -> List[Dict[str, Any]]:
        """
        Return custom commands provided by this plugin
        Each command should have: name, description, handler
        """
        return []
    
    def update_settings(self, settings: Dict[str, Any]):
        """Update plugin settings"""
        self.settings.update(settings)


@dataclass
class LoadedPlugin:
    """A loaded plugin instance"""
    metadata: PluginMetadata
    instance: WingmanPlugin
    enabled: bool
    path: str


class PluginSystem:
    """
    Manages plugin loading, lifecycle, and hooks
    """
    
    def __init__(self, plugins_dir: Optional[Path] = None):
        self.plugins_dir = plugins_dir or Path("./plugins")
        self._plugins: Dict[str, LoadedPlugin] = {}
        self._hooks: Dict[str, List[Callable]] = {
            "on_question": [],
            "on_answer": [],
            "on_transcript": [],
            "on_screen_capture": [],
            "on_mode_change": [],
            "on_session_start": [],
            "on_session_end": [],
        }
        self._engine = None
    
    def set_engine(self, engine):
        """Set reference to main engine"""
        self._engine = engine
    
    async def initialize(self):
        """Initialize plugin system and load plugins"""
        # Create plugins directory if it doesn't exist
        self.plugins_dir.mkdir(parents=True, exist_ok=True)
        
        # Create example plugin template
        await self._create_plugin_template()
        
        # Load all plugins from directory
        await self.load_all_plugins()
        
        logger.info(f"Plugin system initialized ({len(self._plugins)} plugins loaded)")
    
    async def _create_plugin_template(self):
        """Create an example plugin template"""
        template_path = self.plugins_dir / "_example_plugin.py.template"
        
        if template_path.exists():
            return
        
        template = '''"""
Example Wingman AI Plugin
Copy this file and rename to create your own plugin

Your plugin file should be named: your_plugin_name.py
"""

from modules.plugins.plugin_system import WingmanPlugin, PluginMetadata


class ExamplePlugin(WingmanPlugin):
    """Example plugin implementation"""
    
    metadata = PluginMetadata(
        name="Example Plugin",
        version="1.0.0",
        description="An example plugin template",
        author="Your Name",
        dependencies=[],
        settings_schema={
            "greeting": {"type": "string", "default": "Hello!"}
        }
    )
    
    async def initialize(self) -> bool:
        """Initialize your plugin here"""
        print(f"Example plugin initialized with settings: {self.settings}")
        return True
    
    async def shutdown(self):
        """Cleanup your plugin here"""
        print("Example plugin shutting down")
    
    async def on_question(self, question: str, source: str, mode: str):
        """Modify or react to questions"""
        # Return None to use original question
        # Return a string to modify the question
        return None
    
    async def on_answer(self, question: str, answer: str):
        """Modify or react to answers"""
        # Add a custom footer to all answers
        # return answer + f"\\n\\n{self.settings.get('greeting', 'Hello!')}"
        return None


# This is required - the system looks for a 'plugin_class' variable
plugin_class = ExamplePlugin
'''
        
        template_path.write_text(template)
        logger.debug("Created plugin template")
    
    async def load_all_plugins(self):
        """Load all plugins from the plugins directory"""
        if not self.plugins_dir.exists():
            return
        
        for plugin_file in self.plugins_dir.glob("*.py"):
            # Skip template and private files
            if plugin_file.name.startswith("_"):
                continue
            
            try:
                await self.load_plugin(plugin_file)
            except Exception as e:
                logger.error(f"Failed to load plugin {plugin_file.name}: {e}")
    
    async def load_plugin(self, plugin_path: Path) -> Optional[LoadedPlugin]:
        """Load a single plugin from file"""
        try:
            # Load the module
            spec = importlib.util.spec_from_file_location(
                plugin_path.stem,
                plugin_path
            )
            
            if spec is None or spec.loader is None:
                logger.error(f"Could not load plugin spec: {plugin_path}")
                return None
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Get the plugin class
            if not hasattr(module, "plugin_class"):
                logger.warning(f"Plugin {plugin_path.name} missing 'plugin_class' variable")
                return None
            
            plugin_class: Type[WingmanPlugin] = module.plugin_class
            
            # Validate metadata
            if not hasattr(plugin_class, "metadata"):
                logger.warning(f"Plugin {plugin_path.name} missing metadata")
                return None
            
            # Create instance
            instance = plugin_class(engine=self._engine)
            
            # Apply default settings
            if plugin_class.metadata.settings_schema:
                for key, schema in plugin_class.metadata.settings_schema.items():
                    if "default" in schema:
                        instance.settings[key] = schema["default"]
            
            # Initialize plugin
            success = await instance.initialize()
            
            if not success:
                logger.warning(f"Plugin {plugin_class.metadata.name} failed to initialize")
                return None
            
            # Store plugin
            loaded = LoadedPlugin(
                metadata=plugin_class.metadata,
                instance=instance,
                enabled=True,
                path=str(plugin_path)
            )
            
            self._plugins[plugin_class.metadata.name] = loaded
            
            # Register hooks
            self._register_hooks(instance)
            
            logger.info(f"Loaded plugin: {plugin_class.metadata.name} v{plugin_class.metadata.version}")
            return loaded
            
        except Exception as e:
            logger.error(f"Error loading plugin {plugin_path}: {e}")
            return None
    
    def _register_hooks(self, plugin: WingmanPlugin):
        """Register plugin hooks"""
        for hook_name in self._hooks:
            if hasattr(plugin, hook_name):
                handler = getattr(plugin, hook_name)
                if callable(handler):
                    self._hooks[hook_name].append(handler)
    
    def _unregister_hooks(self, plugin: WingmanPlugin):
        """Unregister plugin hooks"""
        for hook_name, handlers in self._hooks.items():
            if hasattr(plugin, hook_name):
                handler = getattr(plugin, hook_name)
                if handler in handlers:
                    handlers.remove(handler)
    
    async def unload_plugin(self, name: str):
        """Unload a plugin"""
        if name not in self._plugins:
            return
        
        loaded = self._plugins[name]
        
        # Shutdown
        await loaded.instance.shutdown()
        
        # Unregister hooks
        self._unregister_hooks(loaded.instance)
        
        # Remove
        del self._plugins[name]
        
        logger.info(f"Unloaded plugin: {name}")
    
    async def reload_plugin(self, name: str):
        """Reload a plugin"""
        if name not in self._plugins:
            return
        
        path = Path(self._plugins[name].path)
        await self.unload_plugin(name)
        await self.load_plugin(path)
    
    def enable_plugin(self, name: str):
        """Enable a plugin"""
        if name in self._plugins:
            self._plugins[name].enabled = True
            self._plugins[name].instance.enabled = True
            logger.info(f"Enabled plugin: {name}")
    
    def disable_plugin(self, name: str):
        """Disable a plugin"""
        if name in self._plugins:
            self._plugins[name].enabled = False
            self._plugins[name].instance.enabled = False
            logger.info(f"Disabled plugin: {name}")
    
    # Hook execution
    
    async def execute_hook(
        self,
        hook_name: str,
        *args,
        modify: bool = False
    ) -> Any:
        """
        Execute a hook on all enabled plugins
        
        Args:
            hook_name: Name of the hook to execute
            *args: Arguments to pass to hook handlers
            modify: If True, use return values to modify the first argument
            
        Returns:
            Modified first argument if modify=True, else None
        """
        if hook_name not in self._hooks:
            return args[0] if modify and args else None
        
        result = args[0] if args else None
        
        for handler in self._hooks[hook_name]:
            try:
                # Check if plugin is enabled
                for loaded in self._plugins.values():
                    if hasattr(loaded.instance, hook_name):
                        if getattr(loaded.instance, hook_name) == handler:
                            if not loaded.enabled:
                                continue
                
                if modify and result is not None:
                    modified = await handler(result, *args[1:])
                    if modified is not None:
                        result = modified
                else:
                    await handler(*args)
                    
            except Exception as e:
                logger.error(f"Hook {hook_name} error: {e}")
        
        return result if modify else None
    
    # Plugin info
    
    def get_plugins(self) -> List[Dict[str, Any]]:
        """Get list of all plugins"""
        return [
            {
                "name": loaded.metadata.name,
                "version": loaded.metadata.version,
                "description": loaded.metadata.description,
                "author": loaded.metadata.author,
                "enabled": loaded.enabled,
                "path": loaded.path
            }
            for loaded in self._plugins.values()
        ]
    
    def get_plugin_settings(self, name: str) -> Dict[str, Any]:
        """Get plugin settings"""
        if name in self._plugins:
            return self._plugins[name].instance.settings.copy()
        return {}
    
    def update_plugin_settings(self, name: str, settings: Dict[str, Any]):
        """Update plugin settings"""
        if name in self._plugins:
            self._plugins[name].instance.update_settings(settings)
            logger.debug(f"Updated settings for plugin: {name}")
    
    def get_all_commands(self) -> List[Dict[str, Any]]:
        """Get commands from all enabled plugins"""
        commands = []
        
        for loaded in self._plugins.values():
            if loaded.enabled:
                plugin_commands = loaded.instance.get_commands()
                for cmd in plugin_commands:
                    cmd["plugin"] = loaded.metadata.name
                    commands.append(cmd)
        
        return commands
    
    async def shutdown(self):
        """Shutdown all plugins"""
        for name in list(self._plugins.keys()):
            await self.unload_plugin(name)
        
        logger.info("Plugin system shutdown")

