// ui/PromptBox.js
import { fontStyle } from '../fonts.js';

export default class PromptBox {
    constructor(scene, message, options, onSelect, type = 'buttons', playerName = '', playerColor = 0xffffff, mode = 'default', customSpacing = 80) {

        this.scene = scene;
        this.onSelect = onSelect;
        this.type = type;
        this.optionTexts = [];

        const W = scene.cameras.main.width;
        const H = scene.cameras.main.height;

        this.boxW = 400;
        this.boxH = 240;

        if (mode === 'event') {
            this.boxW = 520;
            this.boxH = 300;
        }

        if (mode === 'playerselect') {
            this.boxW = 450;
            this.boxH = 220;
        }


        // Cleanup any previous prompt that might be active
        if (scene.activePrompt) {
            scene.activePrompt.destroy();
        }

        this.container = scene.add.container(W / 2, H / 2);
        this.container.setDepth(100);
        this.container.setScale(1);
        this.container.setAlpha(1);

        // Background overlay
        this.bg = scene.add.graphics();
        this.bg.fillStyle(0x000000, 0.85);
        this.bg.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, 16);
        this.container.add(this.bg);

        // Message
        this.label = scene.add.text(0, -20, message,
            fontStyle(26, { align: 'center', wordWrap: { width: this.boxW - 40 } }))
            .setOrigin(0.5);
        this.container.add(this.label);

        
        if (playerName) {
            const labelY = -this.boxH / 2 + 30;
            this.playerCircle = scene.add.circle(-60, labelY, 10, playerColor)
                .setStrokeStyle(2, 0xffffff);
            this.playerLabel = scene.add.text(-40, labelY, playerName, fontStyle(22, { fill: '#ffffcc' }))
                .setOrigin(0, 0.5);

            this.container.add(this.playerCircle);
            this.container.add(this.playerLabel);
        }


        this.buttons = [];

        if (type === 'buttons') {
            
            // Show choices like 0, 1, 2
            const spacing = customSpacing || 80;
            const totalWidth = (options.length - 1) * spacing;
            const startX = -totalWidth / 2;

            // 👇 Move button lower if mode is 'event'
            const btnY = (mode === 'event') ? 100 : 60;

            options.forEach((opt, i) => {
                const btn = scene.add.text(startX + i * spacing, btnY, `${opt}`,
                    fontStyle(24, {
                        backgroundColor: '#333',
                        padding: { x: 16, y: 10 }
                    }))
                    .setOrigin(0.5).setInteractive();

                this.container.add(btn);

                btn.on('pointerdown', () => {
                    this.close(() => {
                        if (this.onSelect) this.onSelect(opt);
                    });
                });

                this.buttons.push(btn);
            });


        } else if (type === 'input') {
            // Create DOM input
            const inputId = 'player-name-input';
            this.input = scene.add.dom(W / 2, H / 2 + 50).createFromHTML(`
                <input id="${inputId}" type="text" placeholder="Enter name..." style="
                    width: 240px;
                    font-size: 18px;
                    padding: 10px;
                    border-radius: 8px;
                    text-align: center;
                ">
            `).setDepth(102);

            // Delay focus to ensure DOM is mounted
            scene.time.delayedCall(100, () => {
                const el = document.getElementById(inputId);
                if (el) {
                    el.focus();

                    el.addEventListener('click', () => {
                        el.focus();  // regains focus on click
                    });

                    el.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            const name = el.value.trim();
                            if (name.length > 0 && this.onSelect) {
                                this.close(() => this.onSelect(name));
                            }
                        }
                    });
                }
            });
        }

        if (type === 'debt') {
                const centerX = 0;
                const rowYStart = 40;
                const rowSpacing = 50;
                const buttonSpacing = 60;

                const takeOpts = options.filter(o => o.label.startsWith('Take'));
                const repayOpts = options.filter(o => o.label.startsWith('Repay'));

                const createRow = (labelText, opts, y) => {
                    // Label (e.g., "Take –")
                    const label = scene.add.text(centerX - 100, y, `${labelText} –`, fontStyle(20)).setOrigin(1, 0.5);
                    this.container.add(label);
                    this.optionTexts.push(label); // track for cleanup

                    // Buttons (1, 2, 3)
                    opts.forEach((opt, i) => {
                        const isDisabled = opt.disabled;
                        const btn = scene.add.text(centerX + i * buttonSpacing - 30, y, opt.label.split(' ')[1], fontStyle(20, {
                            backgroundColor: isDisabled ? '#222' : '#333',
                            fill: isDisabled ? '#777777' : '#ffffff',
                            padding: { x: 12, y: 6 }
                        }))
                        .setOrigin(0.5);

                        if (!isDisabled) {
                            btn.setInteractive().on('pointerdown', () => {
                                this.close(() => this.onSelect(opt.label));
                            });
                        }

                        this.container.add(btn);
                        this.optionTexts.push(btn); // track the button label too
                        this.buttons.push(btn);
                    });
                };

                createRow('Take', takeOpts, rowYStart);
                createRow('Repay', repayOpts, rowYStart + rowSpacing);
        }




                


        this.container.setAlpha(0);
        this.container.setScale(0.9);
        scene.tweens.add({
            targets: this.container,
            alpha: 1,
            scale: 1,
            duration: 150,
            ease: 'Power2'
        });




    }




    setStyleByType(type) {
        if (!this.bg || !this.label) return;

        const x = -this.boxW / 2;
        const y = -this.boxH / 2;

        if (type === 'beneficial') {
            this.bg.clear();
            this.bg.fillStyle(0x6ccf6c, 0.95); // green
            this.bg.fillRoundedRect(x, y, this.boxW, this.boxH, 16);
            this.label.setColor('#103c10');
        } else if (type === 'adverse') {
            this.bg.clear();
            this.bg.fillStyle(0xe36666, 0.95); // red
            this.bg.fillRoundedRect(x, y, this.boxW, this.boxH, 16);
            this.label.setColor('#3c1010');
        } else {
            this.bg.clear();
            this.bg.fillStyle(0x000000, 0.85);
            this.bg.fillRoundedRect(x, y, this.boxW, this.boxH, 16);
            this.label.setColor('#ffffff');
        }

    
    }






        destroy() {
            this.bg?.destroy();
            this.label?.destroy();
            this.buttons?.forEach(btn => btn.destroy());
            this.input?.destroy();

            // Clean up debt prompt labels/texts
            this.optionTexts.forEach(txt => txt.destroy());
            this.optionTexts = [];

            if (this.playerLabel) {
                this.playerLabel.destroy();
                this.playerLabel = null;
            }
            if (this.playerCircle) {
                this.playerCircle.destroy();
                this.playerCircle = null;
            }

            if (this.container) {
                this.container.destroy();
            }
        }


        close(withCallback = null) {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 0,
                scale: 0.9,
                duration: 100,
                ease: 'Power1',
                onComplete: () => {
                    this.destroy();
                    if (withCallback) withCallback();
                }
            });

            if (this.input) {
                this.input.destroy(); // DOM can't tween
            }
        }




}
