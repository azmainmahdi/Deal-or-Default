import { fontStyle } from '../fonts.js';

export default class Layout {
    constructor(scene, playerCount) {

        
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Define a base resolution (e.g., 1920x1080)
        const baseWidth = 1920;
        const baseHeight = 1080;

        // Calculate scale factor based on the current screen size
        const scaleX = screenWidth / baseWidth;  // Scale factor based on width
        const scaleY = screenHeight / baseHeight; // Scale factor based on height
        const scaleFactor = Math.min(scaleX, scaleY);  // Use the smaller factor to avoid distortion
        this.scaleFactor = scaleFactor; 

        


        this.scene = scene;
        this.projectTexts = []; // Store project labels per player
        this.capitalLabels = [];
        this.waiverLabels = [];
        this.crowns = [];
        this.debtLabels = [];

        const W = scene.cameras.main.width;
        const H = scene.cameras.main.height;

        // three equal-width columns (30 % / 40 % / 30 %)
        const leftW = W * 0.20;  // 20% width for the left column
        const rightW = W * 0.30; // 30% width for the right column
        const gutter = W * 0.05; // 5% gap between columns
        
        const middleW = screenWidth * 0.50 * scaleFactor;  // 50% of screen width for the middle column
        
        const leftStart = 0;
        const rightStart = W - rightW;

        // Scale font size based on screen height
        const font = Math.min(24, Math.min(W / 1920, H / 1080) * 24);  // Scales font size with screen size


        /* ---------- LEFT COLUMN ---------- */
        // Example position for the players' label
        const legX = leftStart + gutter;
        const legY = H * 0.18;  // 8% from top


        // 🖼️ Add Game Logo above the player list (responsive)
        const logoWidthRatio = 0.10; // logo width as a % of screen width
        const logoX = W * 0.08;      // 5% from the left
        const logoY = H * 0.05;      // 3% from the top

        const logo = scene.add.image(logoX, logoY, 'logo')
            .setOrigin(0, 0)
            .setDisplaySize(W * logoWidthRatio, (W * logoWidthRatio) * 0.6) // maintain aspect ratio
            .setAlpha(0.85); // slight transparency

                        


        scene.add.text(legX, legY, 'Players',
            fontStyle(font, { wordWrap: { width: 200 } }));

        const colours = [0xffa500 , 0x008080 , 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
        for (let i = 0; i < playerCount; i++) {
            const y = legY + 50 + i * font * 5;
            const circle = scene.add.circle(0, 0, font * 0.8, colours[i])
                .setStrokeStyle(3, 0xffffff);

            const number = scene.add.text(0, 0, `${i + 1}`, {
                fontFamily: 'JetBrains Mono',
                fontSize: font * 1,
                color: '#ffffff'
            }).setOrigin(0.5);

            const circleContainer = scene.add.container(legX + 20, y, [circle, number]);
            


            scene.add.text(legX + 50, y, scene.playerNames?.[i] || `Player ${i + 1}`, fontStyle(font * 1.1)).setOrigin(0, 0.5);
            
            const capText = scene.add.text(W *0.22 , y, `🪙5`, fontStyle(font * 1.2, {
                fill: '#ffff88',
                align: 'right'
            })).setOrigin(1, 0.5);

            const waiverY = y + font * 1.1; // a bit lower
            const waiverText = scene.add.text(W *0.19, waiverY, `🎟️ x1`, fontStyle(font * 1, {
                fill: '#aaaaff',
                align: 'right'
            })).setOrigin(1, 0.5);

            this.waiverLabels.push(waiverText);


            const debtText = scene.add.text(
                W *0.14, waiverY, // 👈 X moved left, Y aligned
                `💰x0`,
                fontStyle(font * 1, {
                    fill: '#ffaa88',
                    align: 'right'
                })
            ).setOrigin(1, 0.5);

            
            this.debtLabels.push(debtText);


            this.capitalLabels.push(capText);

            const projectText = scene.add.text(
                W * 0.08,
                waiverY + font * 0.8,
                '',
                fontStyle(font * 1, {
                    fill: '#aaaaaa',
                    wordWrap: { width: 200 }  // Increased for larger font
                })
            ).setOrigin(0, 0);

            this.projectTexts.push(projectText);

            // At the end of the for-loop that builds player UI
            this.globalEventBaseY = H * 0.2+ playerCount * font * 5 + 40;

            scene.add.text(legX, this.globalEventBaseY, 'MicroEvents:', fontStyle(font * 0.9, {
                fill: '#ffffff'
            })).setOrigin(0, 0);

            this.globalEventUI = [];


          // 📘 Manual (visual-only) button anchored from bottom
            const manualY = this.scene.cameras.main.height *0.94; 
            const manualX = this.scene.cameras.main.width *0.02; 
            this.manualVisual = scene.add.text(
                manualX,
                manualY,
                '📘 Manual',
                fontStyle(font * 1.1, {
                    backgroundColor: '0x131928',
                    padding: { x: 12, y: 6 },
                    fill: '#ffffff'
                })
            ).setOrigin(0, 0).setDepth(5).setAlpha(0.55);

                        

        }

        

        /* ---------- RIGHT COLUMN ---------- */
        const diceX = rightStart + gutter;
        const diceY = screenHeight * 0.06;
        const infoY = diceY + font * 8;

        // dice container
        this.diceContainer = this.scene.add.container(diceX + 50, diceY + 50);
        this.diceContainer.setScale(scaleFactor*1.5);

        // 🎯 BACKGROUND behind dice
        this.diceBackground = this.scene.add.graphics();
        this.diceBackground.setDepth(0); // below everything in the container
        this.diceContainer.add(this.diceBackground);


        // dice graphics
        this.diceGraphics = this.scene.add.graphics();
        this.diceContainer.add(this.diceGraphics);

        // labels
        const step = font * 2.4;
        this.turnLbl = scene.add.text(diceX, infoY, '', fontStyle(font* 1.4));
        this.rollLbl = scene.add.text(diceX, infoY + step, 'Dice: –', fontStyle(font* 1.4));
        this.showCrunchIndicator(false);
        this.msgLbl = scene.add.text(diceX, infoY + 3.8 * step, '', fontStyle(font * 1.3, {
            wordWrap: { width: rightW - 2 * gutter }
        }));
        this.capLbl = scene.add.text(diceX, infoY + 3 * step, '', fontStyle(font* 1.4));

        this.historyLogs = [];
        this.maxHistory = 10;
        this.historyY = infoY + 6.5 * step;

        // Initial dice face
        this.drawDiceFace(1);


        this.diceContainer.setSize(80, 80);  // define hit area
        this.diceContainer.setInteractive();
        this.diceContainer.setScale(this.scaleFactor*1.3);
        this.diceContainer.on('pointerdown', () => {
            this.scene.handleRoll();  // same as pressing R
        });



        this.debtButton = this.scene.add.text(diceX, this.historyY + 160, '💰 Debt / Repay', fontStyle(font * 1.1, {
            backgroundColor: '#444',
            padding: { x: 12, y: 6 }
        }))
        .setOrigin(0, 0)
        .setInteractive()
        .setDepth(5)
        .on('pointerdown', () => {
            this.scene.showDebtPrompt();  // will define this next
        });


    }

    /* public helpers */
    updateTurn(t) { this.turnLbl.setText(t); }
    updateRoll(t) { this.rollLbl.setText(t); }
    updateMsg(newText, type = null) {
        if (!this._currentMsg) this._currentMsg = '';

        // Push previous message to history
        if (this._currentMsg !== '') {
            this.pushHistory(this._currentMsg);
        }

        this._currentMsg = newText;

        // 🎨 Color priority: use type if provided
        let fill = '#ffffff'; // default white

        if (type === 'beneficial') {
            fill = '#88ff88'; // green
        } else if (type === 'adverse') {
            fill = '#ff8888'; // red
        } else {
            // fallback to guessing based on content
            const lower = (typeof newText === 'string') ? newText.toLowerCase() : '';
            if (
                lower.includes('earned') || lower.includes('gained') ||
                lower.includes('+') || lower.includes('climbed') ||
                lower.includes('used a waiver') || lower.includes('invested') ||
                lower.includes('zoomed') || lower.includes('teleported') ||
                lower.includes('fast-tracked') || lower.includes('jumped') ||
                lower.includes('received') || lower.includes('boosted') ||
                lower.includes('benefit') || lower.includes('advanced')
            ) {
                fill = '#88ff88'; // green
            } else if (
                lower.includes('lost') || lower.includes('fell') ||
                lower.includes('declined') || lower.includes('destroyed') ||
                lower.includes('no waivers') || lower.includes('moved back') ||
                lower.includes('-')
            ) {
                fill = '#ff8888';
            }
        }

        this.msgLbl.setStyle({ fill });
        this.msgLbl.setText(newText);
    }


    /* ---------- dice shake animation ---------- */
    cosmeticDiceShake(roll, onComplete) {
    const size = 70;
    const dotR = 6;
    const spacing = size / 4;

    const fakeRolls = [1, 2, 3, 4, 5, 6];
    Phaser.Utils.Array.Shuffle(fakeRolls);

    let i = 0;
    const interval = this.scene.time.addEvent({
        delay: 80,
        repeat: 7,
        callback: () => {
            const val = fakeRolls[i++ % fakeRolls.length];
            this.drawDiceFace(val);
        }
    });

    this.scene.tweens.add({
        targets: this.diceContainer,
        angle: { from: -10, to: 10 },
       scaleX: { from: this.scaleFactor * 1.1, to: this.scaleFactor * 1.5 },
        scaleY: { from: this.scaleFactor * 1.1, to: this.scaleFactor * 1.5 },
        duration: 100,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
            interval.remove();
            this.diceContainer.angle = 0;
             this.diceContainer.setScale(this.scaleFactor*1.3); // ✅ Restore correct scale
            this.drawDiceFace(roll); // final result

            this.scene.time.delayedCall(400, () => {
                if (onComplete) onComplete();
            });
        }
    });
}


    updateDiceBackground(color) {
        const size = 80;
        this.diceBackground.clear();
        this.diceBackground.fillStyle(color, 0.8); // semi-transparent
        this.diceBackground.fillRoundedRect(-size / 2 - 4, -size / 2 - 4, size + 8, size + 8, 10);
    }

    /* ---------- draw dice face ---------- */
    drawDiceFace(value) {
        const size = 70;
        const dotR = 6;
        const spacing = size / 4;

        this.diceGraphics.clear();
        this.diceGraphics.fillStyle(0xffffff, 1);
        this.diceGraphics.fillRoundedRect(-size / 2, -size / 2, size, size, 10);

        this.diceGraphics.fillStyle(0x000000, 1);
        const dots = {
            1: [[0, 0]],
            2: [[-spacing, -spacing], [spacing, spacing]],
            3: [[-spacing, -spacing], [0, 0], [spacing, spacing]],
            4: [[-spacing, -spacing], [spacing, -spacing], [-spacing, spacing], [spacing, spacing]],
            5: [[-spacing, -spacing], [spacing, -spacing], [0, 0], [-spacing, spacing], [spacing, spacing]],
            6: [[-spacing, -spacing], [spacing, -spacing], [-spacing, 0], [spacing, 0], [-spacing, spacing], [spacing, spacing]]
        };
        dots[value].forEach(([x, y]) => this.diceGraphics.fillCircle(x, y, dotR));
    }


    updatePlayerCapital(playerIndex, value) {
        if (this.capitalLabels[playerIndex]) {
            this.capitalLabels[playerIndex].setText(`🪙${value}`);
        }
    }


  updatePlayerProjects(playerIndex, projects) {
        if (!this.projectTexts[playerIndex]) return;

        if (!projects || projects.length === 0) {
            this.projectTexts[playerIndex].setText('No active projects');
            return;
        }

        const lines = projects.map(p => {
            if (p.profit === '💥 Destroyed') return `💥 Project destroyed!`;
            return `⏳${p.ttm} → 💰${p.profit}`;
        });
        this.projectTexts[playerIndex].setText(lines.join('\n'));
    }


    pushHistory(text) {
        const W = this.scene.cameras.main.width;
        const rightW = W * 0.30;
        const gutter = W * 0.05;
        const diceX = W - rightW + gutter;

        // 🎨 Choose color
        let fillColor = '#aaa';
        const lower = text.toLowerCase();
        if (
            lower.includes('earned') || lower.includes('gained') ||
            lower.includes('+') || lower.includes('climbed') ||
            lower.includes('used a waiver') || lower.includes('invested') ||
            lower.includes('zoomed') || lower.includes('teleported') ||
            lower.includes('fast-tracked') || lower.includes('jumped') ||
            lower.includes('received') || lower.includes('boosted') ||
            lower.includes('benefit') || lower.includes('advanced')
        ) {
            fillColor = '#88ff88';
        } else if (
            lower.includes('lost') || lower.includes('fell') ||
            lower.includes('declined') || lower.includes('destroyed') ||
            lower.includes('no waivers') || lower.includes('moved back') ||
            lower.includes('-')
        ) {
            fillColor = '#ff8888';
        }

        // Add the new entry *before* shifting others
        const newEntry = this.scene.add.text(diceX, this.historyY, text, fontStyle(16, {
            fill: fillColor,
            wordWrap: { width: rightW - 2 * gutter }
        }));

        const newHeight = newEntry.getBounds().height;

        // Shift older logs *down by height of the new entry*
        this.historyLogs.forEach(entry => {
            entry.y += newHeight + 6; // small gap
            entry.alpha *= 0.75;
        });

        this.historyLogs.unshift(newEntry);

        // Trim old logs
        if (this.historyLogs.length > this.maxHistory) {
            const removed = this.historyLogs.pop();
            removed.destroy();
        }
    }


    //update tariff 
    updatePlayerWaivers(playerIndex, count) {
        if (this.waiverLabels[playerIndex]) {
            this.waiverLabels[playerIndex].setText(`🎟️ x${count}`);
        }
    }

    //update debt
    updateDebtLabel(playerIndex, debt) {
        if (this.debtLabels?.[playerIndex]) {
            this.debtLabels[playerIndex].setText(`💰x${debt}`);
            this.debtLabels[playerIndex].setAlpha(debt > 0 ? 1 : 0.4);
        }
    }


    showCrunchIndicator(active) {
        if (!this.crunchLabel) {
            // Create label once
            this.crunchLabel = this.scene.add.text(
                this.rollLbl.x,
                this.rollLbl.y + 30,
                '⚠ Liquidity Crunch: Halved Rolls',
                fontStyle(18, { fill: '#ff4444' })
            ).setOrigin(0, 0);
            this.crunchLabel.setDepth(5);
        }

        // Update position in case layout shifted
        this.crunchLabel.setPosition(this.rollLbl.x, this.rollLbl.y + 30);

        this.crunchLabel.setVisible(active);
    }


    setDebtButtonActive(isActive) {
        if (this.debtButton) {
            this.debtButton.setStyle({
                backgroundColor: isActive ? '#aa4444' : '#333'
            });
        }
    }


    // 🧩 Render current global micro events in left UI
    renderGlobalEvents(events, playerSprites) {

        const legX = this.scene.cameras.main.width * 0.05;  // Same as gutter, so legX = 5% of width
        
        if (this.globalEventsText) {
            this.globalEventsText.forEach(t => t.destroy());
        }

        this.globalEventsText = [];

        const baseX = legX;
        let baseY = this.globalEventBaseY + 28;

        events.forEach(event => {
            // Event name with type coloring
            const color = event.type === 'beneficial' ? '#00ff00' : '#ff4444';
            const nameText = this.scene.add.text(baseX, baseY, `${event.name}`, {
                fontFamily: 'JetBrains Mono',
                fontSize: '16px',
                color: color
            });
            this.globalEventsText.push(nameText);

            // Turns left in gray
            const turnsText = this.scene.add.text(baseX + nameText.width + 6, baseY, `(${event.turnsLeft})`, {
                fontFamily: 'JetBrains Mono',
                fontSize: '14px',
                color: '#cccccc'
            });
            this.globalEventsText.push(turnsText);

            // Colored dots for affected players
            const radius = 5;
            let dotX = baseX + nameText.width + turnsText.width + 16;

            event.affectedIndices.forEach(i => {
                const dot = this.scene.add.circle(dotX, baseY + 8, radius, this.scene.players[i].color);
                this.globalEventsText.push(dot);
                dotX += 14;
            });

            baseY += 24;
        });
    }








    
}