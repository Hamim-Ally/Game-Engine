import Component from './Component.js';
import TransformComponent from './TransformComponent.js';

export default class GameObject {
    constructor(name = "GameObject") {
        this.name = name;
        this.components = new Map(); // Store components by their class name or a unique key
        this.children = []; // For scene graph hierarchy later
        this.parent = null;

        // Every GameObject should have a TransformComponent
        this.addComponent(new TransformComponent(this));
    }

    /**
     * Adds a component to this GameObject.
     * @param {Component} component The component instance to add.
     * @returns {Component} The added component.
     */
    addComponent(component) {
        if (!(component instanceof Component)) {
            console.error("Attempted to add non-Component object to GameObject:", component);
            return null;
        }
        const componentName = component.constructor.name;
        if (this.components.has(componentName)) {
            console.warn(`GameObject '${this.name}' already has a component of type '${componentName}'.`);
            return this.components.get(componentName);
        }
        this.components.set(componentName, component);
        return component;
    }

    /**
     * Retrieves a component of a specific type from this GameObject.
     * @param {Function} ComponentType The class constructor of the component to retrieve (e.g., TransformComponent).
     * @returns {Component | undefined} The component instance, or undefined if not found.
     */
    getComponent(ComponentType) {
        if (typeof ComponentType !== 'function' || !ComponentType.name) {
            console.error("getComponent expects a Component class constructor.");
            return undefined;
        }
        return this.components.get(ComponentType.name);
    }

    /**
     * Removes a component of a specific type from this GameObject.
     * @param {Function} ComponentType The class constructor of the component to remove.
     * @returns {boolean} True if the component was removed, false otherwise.
     */
    removeComponent(ComponentType) {
        if (typeof ComponentType !== 'function' || !ComponentType.name) {
            console.error("removeComponent expects a Component class constructor.");
            return false;
        }
        const componentName = ComponentType.name;
        if (this.components.has(componentName)) {
            const component = this.components.get(componentName);
            if (component.onDestroy) {
                component.onDestroy();
            }
            this.components.delete(componentName);
            return true;
        }
        return false;
    }

    /**
     * Calls the start method on all attached components.
     * This should typically be called once after a GameObject is created and added to a scene.
     */
    start() {
        for (const component of this.components.values()) {
            if (component.start) {
                component.start();
            }
        }
    }

    /**
     * Calls the update method on all attached components.
     * @param {number} deltaTime The time elapsed since the last frame.
     */
    update(deltaTime) {
        for (const component of this.components.values()) {
            if (component.update) {
                component.update(deltaTime);
            }
        }
    }
}