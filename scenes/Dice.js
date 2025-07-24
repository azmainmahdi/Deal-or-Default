export default class Dice {
    constructor(scene, board, ui) {
        this.scene = scene;
        this.board = board;
        this.ui = ui;
        this.currentTileIndex = 0;

        this.dieImage = scene.add.image(650, 100, 'die1').setInteractive();

        this.dieImage.on('pointerdown', () => {
            let roll = Phaser.Math.Between(1, 6);
            this.dieImage.setTexture('die' + roll);
            this.ui.showRollResult(roll);

            this.currentTileIndex += roll;
            if (this.currentTileIndex > 99) this.currentTileIndex = 99;
            this.board.movePawn(this.currentTileIndex);
        });
    }
}
