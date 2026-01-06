import Game from './core/Game.js';
// Removed perspective import as it's now handled within Game.handleResize()
// import { perspective } from './math/mat4.js'; 

console.log("renderer.js started"); // Added log

async function main() {
    console.log("Creating Game object..."); // Added log
    const game = new Game();
    console.log("Game object created."); // Added log

    try {
        console.log("Calling game.init()..."); // Added log
        await game.init();
        console.log("game.init() completed successfully."); // Added log
    } catch (error) {
        console.error("Error during game.init():", error); // Added error logging
        return; // Stop execution if init fails
    }
    
    game.start();
    console.log("Game started."); // Added log

    // Handle window resizing
    window.addEventListener('resize', () => {
        game.handleResize(); // Call the new handleResize method
    });
    // Initial call to handleResize to set up initial aspect ratio for camera
    game.handleResize();
}

main();