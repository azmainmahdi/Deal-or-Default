import GameScene from './scenes/GameScene.js';

document.fonts.load('20px "JetBrains Mono"').then(() => {
    console.log('JetBrains Mono loaded.');
});


const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,   // ← real-time resize to viewport
        parent: 'body',
        width: window.innerWidth,
        height: window.innerHeight
    },
    dom: {
        createContainer: true  // ✅ this is the key!
    },
    backgroundColor: '0x131928',
    scene: [GameScene]
};

new Phaser.Game(config);
