export default class ManualPromptBox {
    constructor(scene, message, onClose) {
        this.scene = scene;
        this.onClose = onClose;

        // Defining box dimensions and position
        const W = scene.cameras.main.width;
        const H = scene.cameras.main.height;

        this.boxW = 1100;  // Manual box width
        this.boxH = 700;  // Manual box height

        // Center the box in the middle of the screen
        this.container = scene.add.container(W / 2, H / 2);
        this.container.setDepth(100);
        this.container.setScale(1);
        this.container.setAlpha(1);

        // Background overlay with rounded corners
        this.bg = scene.add.graphics();
        this.bg.fillStyle(0x222222, 0.95);  // Dark background
        this.bg.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, 16);
        this.container.add(this.bg);

        // Adding the scrollable manual text
        this.messageText = scene.add.text(-this.boxW / 2 + 0, -this.boxH / 2 + 20, message, {
            fontFamily: 'JetBrains Mono',  // Choose your font
            fontSize: '16px',
            color: '#FFFFFF',
            wordWrap: { width: this.boxW - 80 },  // Ensuring text wraps
            align: 'left'
        }).setOrigin(0, 0);
        this.container.add(this.messageText);

        // Close button at the bottom of the box
        const closeBtn = scene.add.text(0, this.boxH / 2 - 40, 'Close', {
            fontFamily: 'JetBrains Mono',
            fontSize: '20px',
            color: '#FFFFFF',
            backgroundColor: '#444444',
            padding: { x: 20, y: 10 },
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        closeBtn.on('pointerdown', () => {
            this.close();
        });
        this.container.add(closeBtn);

        // Add a scrollable feature to the text
        this.scrollArea = scene.add.graphics().fillStyle(0x000000, 0).fillRect(-this.boxW / 2 + 20, -this.boxH / 2 + 60, this.boxW - 40, this.boxH - 120);
        this.container.add(this.scrollArea);

        // Make sure the text can scroll if it's larger than the box
        const maxHeight = this.boxH - 120;
        if (this.messageText.height > maxHeight) {
            this.messageText.setMaxHeight(maxHeight);
            this.scrollArea.setInteractive();
        }
    }

    close() {
        this.container.destroy();  // Destroy the container, effectively closing the prompt
        if (this.onClose) this.onClose();
    }
}
