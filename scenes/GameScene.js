import Board from './Board.js';
import Player from './Player.js';
import Layout from './Layout.js';
import PromptBox from '../ui/PromptBox.js'; 
import ManualPromptBox from '../ui/ManualPromptBox.js'; // Adjust path if needed
import { drawEvent, applyEvent, drawGlobalEvent, applyGlobalEvents, tickGlobalEvents, microEvents, beneficialEvents, globalMicroEvents } from './microEvents.js';
import { fontStyle } from '../fonts.js';




export default class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); this.activePrompt = null;
    
    // ✅ Tracks all active global micro events
    this.activeGlobalEvents = []; // Each: { name, turnsLeft, affectedIndices }


}
    

    preload() {
        this.load.image('wallpaper', './assets/bg.png'); // Adjust path to your wallpaper image
        this.load.image('logo', './assets/logo.png');  // Load your logo
        this.load.image('boardBackground', 'assets/board.png'); 
        this.load.svg('eventIcon', 'assets/event.svg');
        this.load.svg('tariffIcon', 'assets/tariff.svg');
        this.load.svg('sanctionIcon', 'assets/sanction.svg');
        this.load.svg('ladderIcon', 'assets/ladder.svg');
        this.load.svg('snakeIcon', 'assets/snake.svg');
        this.load.image('goalIcon', 'assets/goal.svg');
    }

    create() {

        const wallpaper = this.add.image(
            this.cameras.main.centerX, this.cameras.main.centerY,
            'wallpaper'
        ).setOrigin(0.5, 0.5).setScale(1.5).setDepth(-1); // Set depth to ensure it's below other UI elements


        // Background rectangle for buttons (size same as the buttons container)
        const buttonWidth = 120;
        const buttonHeight = 50;
        const padding = 10;
        const buttonCount = 5; // 2-6 players
        const totalButtonWidth = (buttonWidth * buttonCount) + (padding * (buttonCount - 1));
        const rectangleHeight = buttonHeight + 150;  // Adjust height to fit buttons, + extra for padding

        const startX = (this.cameras.main.width - totalButtonWidth) / 2;  // Center the buttons horizontally
        const startY = this.cameras.main.height * 0.60;  // Place the buttons 65% down the screen

        const bg = this.add.rectangle(startX, startY, totalButtonWidth, rectangleHeight, 0x222222)
            .setOrigin(0)
            .setDepth(-1)
            .setAlpha(0.95);


        // Add game logo at the top-center, above the buttons
        const logo = this.add.image(this.cameras.main.centerX, startY - 100, 'logo')
        .setOrigin(0.5, 0.9)
        .setScale(window.innerWidth / 4700);  // Scale based on screen width (1920 is the reference width)

        // Player selection text
        this.add.text(
            this.cameras.main.width / 2, startY + 50,
            'How many players? (2-6)',
            fontStyle(32)
        ).setOrigin(0.5);

        // Buttons below the text
        this.menuButtons = [];


        // Start position for the first button (center horizontally and a little down vertically)
        // const startX = (this.cameras.main.width - (buttonWidth * 5 + padding * 4)) / 2; // Calculate starting X position

        for (let i = 2; i <= 6; i++) {
        const btn = this.add.text(
            startX + (i - 1.6) * (buttonWidth + padding), // Calculate X position for each button
            startY + 120, // Y position pushed down a bit more to leave room for the logo
            `${i}P`,  // Player button text
            fontStyle(28, {
                backgroundColor: '#333',
                padding: { x: 30, y: 10 }
            })
        ).setOrigin(0.5).setInteractive();

            btn.on('pointerdown', () => {
                this.cleanupMenu(); // Disable and destroy buttons
                wallpaper.destroy(); // Remove the wallpaper once player is selected
                bg.destroy();  // Remove the background rectangle
                logo.destroy();  // Optionally remove the logo
                this.children.removeAll();  // Clear all children elements
                this.promptPlayerNames(i);  // Start the game with selected player count
                
            });

            this.menuButtons.push(btn);
        }

            

         // Add a small manual button in the lower-left corner
        const manualButton = this.add.text(this.cameras.main.width *0.02, this.cameras.main.height *0.94, '📘 Manual', fontStyle(22, {
            backgroundColor: '#444',
            padding: { x: 18, y: 10 },
            fill: '#fff'
        })).setInteractive().setOrigin(0);

        manualButton.on('pointerdown', () => {
            this.showManual();  // Call function to show instructions
        });

        





        this.input.keyboard.on('keydown', (event) => {
            const key = event.key;
            if (['1', '2', '3', '4', '5', '6'].includes(key)) {
                const forcedRoll = parseInt(key);
                if (this.isRolling) return;
                this.isRolling = true;

                this.layout.cosmeticDiceShake(forcedRoll, () => {
                    this.layout.updateRoll(`Dice: ${forcedRoll}`);
                    this.moveStepByStep(this.currentPlayer, forcedRoll, () => {
                        this.resolveSquare(this.currentPlayer, this.currentPlayerIndex);
                    });
                });
            }
        });

        this.input.keyboard.on('keydown-T', () => {
            const square = prompt("Enter square number (1–100):");
            const sqNum = parseInt(square);

            if (!isNaN(sqNum) && sqNum >= 1 && sqNum <= 100) {
                this.currentPlayer.square = sqNum - 1;
                this.snapPawnToSquare(this.currentPlayer.square);
                this.layout.updateMsg(`${this.getPlayerName(this.currentPlayerIndex)} teleported to ${sqNum}`);
            } else {
                this.layout.updateMsg(`Invalid square input.`);
            }
        });

        this.input.on('pointerdown', () => {
            if (this.activePrompt && this.activePrompt.inputBox) {
                this.activePrompt.inputBox.removeFocus?.();
            }
        });


        this.input.keyboard.on('keydown-G', () => {
            if (!this.players) return;

            const event = drawGlobalEvent();
            event.affectedIndices = [this.currentPlayerIndex]; // Only affects current player

            this.activeGlobalEvents.push(event);
            this.layout.renderGlobalEvents(this.activeGlobalEvents, this.playerSprites);

            this.layout.updateMsg(`🌀 Global Event Triggered: ${event.name}`);
            this._pendingEventLog = `Global Event: ${event.name} began`;
        });

        this.cache.custom.beneficialEvents = beneficialEvents;

           // Adding keybind for H to trigger the new events
    this.input.keyboard.on('keydown-H', () => {
        const eventNames = [
            "Trade Embargo", 
            "Port Blockade", 
            "Insurance Fraud", 
            "Corruption Probe", 
            "Debt Spiral", 
            "Sanction Threat", 
            "Capital Controls"
        ];

        // Pick a random event from the list
        const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
        const event = microEvents.find(ev => ev.name === eventName);

        if (event) {
            console.log(`Triggering Event: ${event.name}`);
            event.applyEffect(this, this.currentPlayer, this.currentPlayerIndex);
        } else {
            console.log("Event not found!");
        }
    });

        // // Example of triggering Trade Embargo event manually via keyboard
        // this.input.keyboard.on('keydown-E', () => {
        //     const event = microEvents.find(ev => ev.name === "Trade Embargo");
        //     if (event) {
        //         event.applyEffect(this, this.currentPlayer, this.currentPlayerIndex);
        //     }
        // });



     



    }

    startGame(count) {
        if (this.activePrompt) {
            this.activePrompt.destroy();
            this.activePrompt = null;
        }
        this.board = new Board(this);

        const colours = [0xffa500, 0x008080, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
        this.players = [];
        for (let i = 0; i < count; i++) {
            const p = new Player(colours[i]);
            p.debt = 0; // ✅ Initialize debt
            this.players.push(p);
        }

        this.currentPlayerIndex = 0;
        this.currentPlayer = this.players[this.currentPlayerIndex]; 

        this.playerSprites = [];
        this.players.forEach((p, idx) => {
            const s = this.add.circle(0, 0, 15, p.color)
                              .setStrokeStyle(2, 0xffffff);
            this.playerSprites.push(s);

            const numberText = this.add.text(0, 0, `${idx + 1}`, {
                fontFamily: 'JetBrains Mono',
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0.5);

            const container = this.add.container(0, 0, [s, numberText]);
            this.playerSprites[idx] = container;
        });


        this.players.forEach((p, idx) => {
            p.square = 0;
            const pos = this.board.centreOf(0);
            const offsetX = (idx % 2) * 16 - 8;
            const offsetY = Math.floor(idx / 2) * 16 - 8;
            this.playerSprites[idx].setPosition(pos.x + offsetX, pos.y + offsetY);
        });

        this.layout = new Layout(this, count);
        this.layout._currentMsg = '';

        this.isRolling = false;

        this.input.keyboard.on('keydown-R', () => {
            console.log('R key pressed');
            this.handleRoll();
        });

        this.updateCurrentTurnUI();

        if (this.layout?.updateDebtButtonState) {
            this.layout.updateDebtButtonState(this.currentPlayer);
        }
        

    }


    

    //For player names
    promptPlayerNames(playerCount) {
        this.playerNames = [];

        const askNext = (index) => {
            if (index >= playerCount) {
                if (this.activePrompt) {
                    this.activePrompt.destroy();
                    this.activePrompt = null;
                }
                this.startGame(playerCount);
                return;
            }

            if (this.activePrompt) {
                this.activePrompt.destroy();
                this.activePrompt = null;

                if (this.manualButton) {
                    this.manualButton.setVisible(true);
                    this.manualButton.setActive(true);
                    this.manualButton.setAlpha(1);
                    this.manualButton.setDepth(999);
                    this.manualButton.setInteractive();
                }
            }

            this.activePrompt = new PromptBox(
                this,
                `Enter name for Player ${index + 1}:`,
                [],
                (name) => {
                    this.playerNames[index] = name || `Player ${index + 1}`;
                    
                    askNext(index + 1);
                },
                'input',
                '',
                '',
                'playerselect'
            );
        };

        askNext(0);
    }





    //This is for refreshing the visuals for player 1 at the start of the game
    updateCurrentTurnUI() {
        this.layout.updateTurn(`Turn: ${this.getPlayerName(this.currentPlayerIndex)}`);
        this.layout.updatePlayerCapital(this.currentPlayerIndex, this.currentPlayer.capital);
        this.layout.updateDiceBackground(this.currentPlayer.color);

        this.layout.showCrunchIndicator(this.isPlayerInCrunch(this.currentPlayer));


        // Set glow ring
        if (this.activeGlow) this.activeGlow.destroy();
        const pawnSprite = this.playerSprites[this.currentPlayerIndex];
        const glow = this.add.graphics();
        glow.setDepth(5);
        glow.fillStyle(0xfffff0, 0.6);
        glow.fillCircle(0, 0, 20);
        glow.setPosition(pawnSprite.x, pawnSprite.y);
        this.activeGlow = glow;

        this.tweens.add({
            targets: glow,
            alpha: { from: 0.9, to: 0.3 },
            scaleX: { from: 1, to: 1.5 },
            scaleY: { from: 1, to: 1.5 },
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        if (this.layout?.updateDebtButtonState) {
            this.layout.updateDebtButtonState(this.currentPlayer);
        }
    }


   handleRoll() {
        if (this.isRolling) return;
        this.isRolling = true;


        // **Check for Trade Embargo** - Skip turn if player is affected
        if (this.currentPlayer.skipNextTurn) {
            this.layout.updateMsg(`${this.getPlayerName(this.currentPlayerIndex)} skips their roll due to Trade Embargo.`);
            console.log(`${this.getPlayerName(this.currentPlayerIndex)} is under embargo, skipping roll.`);
            this.isRolling = false;  // Prevent any further roll actions
            return;
        }


        const rawRoll = Phaser.Math.Between(1, 6);
        const player = this.currentPlayer;
        const index = this.currentPlayerIndex;

        const isCrunch = this.isPlayerInCrunch(player);
        console.log(`ROLL: Player at square ${player.square + 1} with debt ${player.debt} → Crunch: ${isCrunch}`);
        const finalRoll = isCrunch ? Math.floor(rawRoll / 2) : rawRoll;
        

        // Reset extraRoll if previously set by global event
        if (player.extraRoll) {
        finalRoll += player.extraRoll;
        player.extraRoll = 0;  // Reset for next round
        }

        this.layout.cosmeticDiceShake(rawRoll, () => {
            this.layout.updateRoll(`Dice: ${isCrunch ? `${rawRoll} ➝ ${finalRoll}` : finalRoll}`);
            this.layout.showCrunchIndicator(isCrunch);

            this.moveStepByStep(player, finalRoll, () => {
                this.resolveSquare(player, index);
            });
        });

        
    }




    moveStepByStep(player, stepsLeft, onComplete) {
        if (stepsLeft === 0) {
            console.log('Steps finished');
            onComplete();
            return;
        }
        // Cancel move if it would go beyond 99 (square 100)
        if (player.square + stepsLeft > 99) {
            this.layout.updateMsg(`${this.getPlayerName(this.currentPlayerIndex)} needs exact roll to finish!`);
            this.unlockTurnAfterDelay();
            return;
        }

        player.square += 1;

        this.snapPawnToSquare(player.square, () => {
            this.time.delayedCall(200, () =>
                this.moveStepByStep(player, stepsLeft - 1, onComplete)
            );
        });
    }

    snapPawnToSquare(squareIdx, onComplete = null) {
        const centre = this.board.centreOf(squareIdx);
        const overlap = this.players.filter(p => p.square === squareIdx).length;

        let dx = 0, dy = 0;
        if (overlap > 1) {
            const offsets = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
            const idx = this.players.indexOf(this.currentPlayer) % offsets.length;
            dx = offsets[idx][0];
            dy = offsets[idx][1];
        }

        const sprite = this.playerSprites[this.currentPlayerIndex];

        this.tweens.add({
            targets: sprite,
            x: centre.x + dx,
            y: centre.y + dy,
            duration: 70,
            ease: 'Power5',
           onUpdate: () => {
                const glow = this.activeGlow;
                const sprite = this.playerSprites[this.currentPlayerIndex];
                if (glow && sprite) {
                    glow.setPosition(sprite.x, sprite.y);
                }
            },
            onComplete
        });
    }

    resolveSquare(player, playerIndex) {

        // ✅ Check if game should end
        if (player.square === 99 && !player._receivedVictoryBonus) {
            player._receivedVictoryBonus = true;  // ✅ Avoids duplicate bonuses
            player.capital += 20;

            this.layout.updatePlayerCapital(this.currentPlayerIndex, player.capital);
            this.layout.updateMsg(`${this.getPlayerName(this.currentPlayerIndex)} reached square 100 and earned +20 Capital!`, 'beneficial');

            // Optional: slight delay before triggering game end
            this.time.delayedCall(500, () => {
                this.endGame();
            });

            return;  // ⛔ Skip remaining turn logic if desired
        }

        const sq = player.square + 1;
        const info = this.board.specialTiles[sq];

        if (!info) {
            this.layout.updateMsg(`${this.getPlayerName(playerIndex)} landed on a normal tile.`);
            this.unlockTurnAfterDelay();
            return;
        }

        if (info.type === 'ladder') {
            const infoAtTime = info;
            const playerAtTime = player;
            const indexAtTime = playerIndex;

            this.showInvestmentPrompt((chips) => {
                if (chips === 0) {
                    this.layout.updateMsg(`${this.getPlayerName(indexAtTime)} skipped the ladder.`);
                    this.unlockTurnAfterDelay();
                    return;
                }

                const delta = infoAtTime.to - (playerAtTime.square + 1);
                const reward = chips * delta;

                // Defensive: Check capital first
                if (chips > playerAtTime.capital) {
                    this.layout.updateMsg(`Not enough capital to invest.`);
                    this.unlockTurnAfterDelay();
                    return;
                }

                // Deduct capital
                playerAtTime.capital -= chips;
                this.layout.updatePlayerCapital(indexAtTime, playerAtTime.capital);

                // Move to ladder top
                playerAtTime.square = infoAtTime.to - 1;

                // Animate then store reward and proceed
                this.snapPawnToSquare(playerAtTime.square, () => {
                    this.layout.updateMsg(`${this.getPlayerName(indexAtTime)} invested ${chips} and climbed!`);

                    // Defensive init
                    if (!playerAtTime.pendingRewards) playerAtTime.pendingRewards = [];

                  playerAtTime.activeProjects.push({
                        ttm: chips,
                        chips,
                        delta,
                        profit: reward
                    });

                  this.layout.updatePlayerProjects(indexAtTime, playerAtTime.activeProjects);


                    this.unlockTurnAfterDelay();
                });

                

                
            });

            return;
        }


        if (info.type === 'snake') {
            const from = player.square + 1;
            const to = info.to;
            const delta = from - to;
            const hedgeCost = Math.round(delta / 5);

            this.showYesNoPrompt(
                `Snake ahead! Pay ${hedgeCost} to hedge and reduce fall?`,
                (wantsToHedge) => {
                    if (wantsToHedge && player.capital >= hedgeCost) {
                        // ✅ Hedge logic
                        player.capital -= hedgeCost;
                        const reducedDelta = Math.floor(delta / 2);
                        player.square = from - 1 - reducedDelta;

                        this.layout.updateMsg(`${this.getPlayerName(playerIndex)} hedged and only fell ${reducedDelta} squares.`);
                        this.layout.updatePlayerCapital(playerIndex, player.capital);

                        this.snapPawnToSquare(player.square, () => {
                            this.unlockTurnAfterDelay();
                        });

                    } else {
                        // ❌ No hedge or can't afford it
                        player.square = to - 1;

                        // Wipe active projects
                        const lostProjects = player.activeProjects.length;
                        player.activeProjects = [];

                        // Update UI to show "Project Destroyed" message temporarily
                        this.layout.updatePlayerProjects(playerIndex, [{ ttm: 1, profit: '💥 Destroyed' }]);

                        this.layout.updateMsg(`${this.getPlayerName(playerIndex)} fell to ${to}${lostProjects > 0 ? ' and lost all active investments!' : '.'}`);


                        this.snapPawnToSquare(player.square, () => {
                            if (lostProjects > 0) {
                                this.showOkPrompt(`Your ongoing ladder projects were destroyed!`);
                            }

                            console.log("✅ Snake fall complete");
                            console.log("Current player square:", player.square);
                            console.log("Active projects:", player.activeProjects);
                            this.unlockTurnAfterDelay();
                        });
                    }
                }
            );

            return;
        }


        if (info.type === 'tariff') {
            this.layout.updateMsg(`${this.getPlayerName(playerIndex)} triggered a Tariff!`);

            const affected = this.players.map((p, i) => ({ p, i }))
                .filter(({ p }) => p !== player);

            let processed = 0;

            const processNext = () => {
                if (processed >= affected.length) {
                    this.unlockTurnAfterDelay();
                    return;
                }

                const { p: otherPlayer, i: otherIndex } = affected[processed];
                processed++;

                // CASE 1: Player has waivers
                if (otherPlayer.tariffWaivers > 0) {
                    new PromptBox(
                        this,
                        `Spend a Tariff Waiver to ignore setback?`,
                        ['Yes', 'No'],
                        (wantsToUse) => {
                            if (wantsToUse === 'Yes') {
                                // ✅ Deduct waiver and SKIP penalty
                                otherPlayer.tariffWaivers--;
                                this.layout.updatePlayerWaivers(otherIndex, otherPlayer.tariffWaivers);
                                this.layout.updateMsg(`${this.getPlayerName(otherIndex)} used a Tariff Waiver!`);
                                this.layout.pushHistory(`${this.getPlayerName(otherIndex)} used a waiver`);
                                this.time.delayedCall(600, processNext);
                            } else if (wantsToUse === 'No') {
                                // ❌ Decline waiver → move back
                                this.layout.updateMsg(`${this.getPlayerName(otherIndex)} declined to use a waiver.`);
                                this.layout.pushHistory(`${this.getPlayerName(otherIndex)} declined a waiver`);
                                this.time.delayedCall(600, () => {
                                    this.moveBackSteps(otherPlayer, otherIndex, 3, processNext);
                                });
                            }
                        },
                        'buttons',
                        this.getPlayerName(otherIndex),
                        otherPlayer.color
                    );
                }
                // CASE 2: No waivers
                else {
                    this.layout.updateMsg(`${this.getPlayerName(otherIndex)} has no tariff waivers!`);
                    this.layout.pushHistory(`${this.getPlayerName(otherIndex)} had no waivers`);
                    this.time.delayedCall(600, () => {
                        this.moveBackSteps(otherPlayer, otherIndex, 3, processNext);
                    });
                }
            };

            processNext(); // ✅ Start processing affected players
            return;
        }


        // ✅ Trigger a micro event popup with styled PromptBox (green for beneficial, red for adverse).
        // Replaces the raw applyEvent() call with a popup that displays the event before applying it.
        // ✅ Triggers a micro event popup and logs the outcome in the situation panel and history

        if (info.type === 'event') {
           // ✅ Pull a real event from microEvents.js
            const allEvents = [...microEvents, ...globalMicroEvents];
            const event = Phaser.Utils.Array.GetRandom(allEvents);
            const isGlobal = !!event.applyGlobalEffect; // Global if it has applyGlobalEffect

            console.log("EVENT DRAWN:", event); // 🔍 debug

            // Call effect early, but don't push to history yet
            let effectMessage = '';


             
            // Local event logic
                if (event.effect) {
                    effectMessage = event.effect(this, this.currentPlayer, this.currentPlayerIndex);
            }
            

            const promptMessage = `${event.name}:\n${event.description}\n\n${effectMessage}`;

            this.activePrompt = new PromptBox(
                this,
                promptMessage,
                ['OK'],
                () => {
                    // If global event → track it
                    if (event.duration && event.affectedIndices) {
                        this.activeGlobalEvents.push({
                            name: event.name,
                            type: event.type,
                            turnsLeft: event.duration,
                            affectedIndices: event.affectedIndices(this.currentPlayerIndex, this.players)
                        });

                        this.layout.renderGlobalEvents(this.activeGlobalEvents, this.playerSprites);
                    }

                    // Push only the effect to situation panel
                    this.layout.updateMsg(effectMessage);

                    this.activePrompt = null;
                    this.unlockTurnAfterDelay();
                },
                'buttons',
                this.getPlayerName(this.currentPlayerIndex),
                this.currentPlayer.color,
                'event'
            );

            this.activePrompt.setStyleByType(event.type);


        }



        if (info.type === 'sanction') {
            const netWorths = this.players.map((p, i) => ({
                index: i,
                value: p.capital + 1.5 * (p.debt || 0)
            }));

            const maxWorth = Math.max(...netWorths.map(nw => nw.value));
            const leaders = netWorths.filter(nw => nw.value === maxWorth).map(nw => nw.index);

            const leaderNames = leaders.map(i => this.getPlayerName(i)).join(', ');

            this.layout.updateMsg(`Sanction hit! Net-worth leader(s): ${leaderNames} slide back 5.`);

            let processed = 0;

            const moveNextLeader = () => {
                if (processed >= leaders.length) {
                    this.unlockTurnAfterDelay();
                    return;
                }

                const i = leaders[processed++];
                const p = this.players[i];

                this.moveBackSteps(p, i, 5, moveNextLeader);
            };

            this.time.delayedCall(500, moveNextLeader);
            return;
        }


    }




    unlockTurnAfterDelay() {
        this.time.delayedCall(600, () => {
            this.nextTurn();
            this.isRolling = false;
        });

        console.log("🔓 unlockTurnAfterDelay triggered");
    }



   nextTurn() {
        // Continue looking for the next player who is not skipping their turn
    do {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.currentPlayer = this.players[this.currentPlayerIndex];

        // If the current player should skip their turn (due to embargo)
        if (this.currentPlayer.willSkipTurn === 1) {
            console.log(`${this.getPlayerName(this.currentPlayerIndex)} skips their turn due to Trade Embargo.`);
            this.layout.updateMsg(`${this.getPlayerName(this.currentPlayerIndex)} skips their turn due to Trade Embargo.`);

            // Reset willSkipTurn for the next round (so they can play in the future)
            this.currentPlayer.willSkipTurn = 0;  // Reset it so they can play next turn
            continue;  // Skip to the next player immediately
        }

        break;  // If the player is not skipping, continue with their turn

    } while (true); // Keep looping until we find a player who is not skipping


        // ✅ Apply global effects on current player
        const globalOutcomes = applyGlobalEvents(this, this.currentPlayer, this.currentPlayerIndex, this.activeGlobalEvents);
        if (globalOutcomes.length > 0) {
            const combined = globalOutcomes.join('\n');
            this.layout.updateMsg(combined);
            this._pendingEventLog = combined;
        }

        // ✅ Process project rewards
        let gained = 0;
        this.currentPlayer.activeProjects.forEach(p => p.ttm--);
        for (let i = this.currentPlayer.activeProjects.length - 1; i >= 0; i--) {
            if (this.currentPlayer.activeProjects[i].ttm <= 0) {
                gained += this.currentPlayer.activeProjects[i].profit;
                this.currentPlayer.activeProjects.splice(i, 1);
            }
        }
        if (gained > 0) {
            this.currentPlayer.capital += gained;
            this.layout.updateMsg(`${this.getPlayerName(this.currentPlayerIndex)} earned ${gained} chips!`);
        }

        this.layout.updatePlayerProjects(this.currentPlayerIndex, this.currentPlayer.activeProjects);

        this.updateCurrentTurnUI();

        // ✅ Move message to history
        if (this._pendingEventLog) {
            this.layout.pushHistory(this._pendingEventLog);
            this._pendingEventLog = null;
        }

        // ✅ Only tick turns if new round starts
        if (this.isStartOfRound()) {
            this.activeGlobalEvents = tickGlobalEvents(this.activeGlobalEvents);
        }

        if (this.layout?.renderGlobalEvents) {
            this.layout.renderGlobalEvents(this.activeGlobalEvents, this.playerSprites);
        }
    }

    




    showInvestmentPrompt(callback) {
        new PromptBox(this, 'Invest chips (0–3)?', [0, 1, 2, 3], callback, 'buttons', this.getPlayerName(this.currentPlayerIndex), this.currentPlayer.color);
    }   


    showYesNoPrompt(question, callback) {
        new PromptBox(this, question, ['Yes', 'No'], (choice) => {
            callback(choice === 'Yes');
        }, 'buttons', this.getPlayerName(this.currentPlayerIndex), this.currentPlayer.color);
    }

    showOkPrompt(message) {
        new PromptBox(this, message, ['OK'], () => {}, 'buttons', this.getPlayerName(this.currentPlayerIndex), this.currentPlayer.color);
    }


    //For removing the player selection buttons
    cleanupMenu() {
        if (this.menuButtons) {
            this.menuButtons.forEach(btn => {
                btn.disableInteractive();
                btn.destroy();
            });
            this.menuButtons = [];
        }
    }

    //Helper for Tariff Sanction
   moveBackSteps(player, index, steps, callback) {
        const doStep = (remaining) => {
            if (remaining === 0 || player.square === 0) {
                this.layout.updateMsg(`${this.getPlayerName(index)} moved back ${steps} squares.`);
                callback();
                return;
            }

            player.square = Math.max(0, player.square - 1);
            const centre = this.board.centreOf(player.square);
            const sprite = this.playerSprites[index];

            this.tweens.add({
                targets: sprite,
                x: centre.x,
                y: centre.y,
                duration: 200,
                onUpdate: () => {
                    if (this.activeGlow && index === this.currentPlayerIndex) {
                        this.activeGlow.setPosition(sprite.x, sprite.y);
                    }
                },
                onComplete: () => {
                    this.time.delayedCall(100, () => doStep(remaining - 1));
                }
            });
        };

        doStep(steps);
    }


    // Helper function to move players forward
    moveForwardSteps(player, index, steps, callback) {
        const doStep = (remaining) => {
            if (remaining === 0 || player.square === 99) {
                this.layout.updateMsg(`${this.getPlayerName(index)} moved forward ${steps} squares.`);
                callback();
                return;
            }

            player.square = Math.min(99, player.square + 1); // Move player forward by 1 square, up to square 100
            const centre = this.board.centreOf(player.square);
            const sprite = this.playerSprites[index];

            this.tweens.add({
                targets: sprite,
                x: centre.x,
                y: centre.y,
                duration: 200,
                onUpdate: () => {
                    if (this.activeGlow && index === this.currentPlayerIndex) {
                        this.activeGlow.setPosition(sprite.x, sprite.y);
                    }
                },
                onComplete: () => {
                    this.time.delayedCall(100, () => doStep(remaining - 1)); // Recursively move
                }
            });
        };

        doStep(steps);
    }

    //Helper function to replace names
    getPlayerName(index) {
        return this.playerNames?.[index] || `Player ${index + 1}`;
    }

    isPlayerInCrunch(player) {
        return player.debt > 0 && player.square >= 80;
    }



    //For debt coins
    showDebtPrompt() {
        const player = this.currentPlayer;
        const index = this.currentPlayerIndex;

        // If a debt prompt is already open, close it and reset state
        if (this.activePrompt && this.activePrompt.type === 'debt') {
            this.activePrompt.destroy();
            this.activePrompt = null;

            if (this.layout?.setDebtButtonActive) {
                this.layout.setDebtButtonActive(false);
            }

            return;
        }

        const maxTake = Math.min(3, 3 - player.debt);
        const maxRepay = Math.min(3, player.debt, player.capital);

        if (maxTake === 0 && maxRepay === 0) {
            this.showOkPrompt("No debt actions available.");
            return;
        }

        const options = [];

        for (let i = 1; i <= maxTake; i++) {
            options.push({ label: `Take ${i}`, disabled: false });
        }

        for (let i = 1; i <= maxRepay; i++) {
            options.push({ label: `Repay ${i}`, disabled: false });
        }

        // Store reference so we can clean it up safely later
        const promptRef = new PromptBox(
            this,
            'Take or Repay Debt?',
            options,
            (choice) => {
                if (!choice || typeof choice !== 'string') return;

                const parts = choice.split(' ');
                const action = parts[0];
                const amount = parseInt(parts[1]);

                if (isNaN(amount)) return;

                if (action === 'Take') {
                    player.debt += amount;
                    player.capital += amount;
                    this.layout.updateMsg(`${this.getPlayerName(index)} took ${amount} debt`);
                } else if (action === 'Repay') {
                    player.debt -= amount;
                    player.capital -= amount;
                    this.layout.updateMsg(`${this.getPlayerName(index)} repaid ${amount} debt`);
                }

                this.layout.updatePlayerCapital(index, player.capital);
                this.layout.updatePlayerProjects(index, player.activeProjects);
                this.layout.updateDebtLabel(index, player.debt);

                // Clean up the prompt after action
                if (this.activePrompt) {
                    this.activePrompt.destroy();
                    this.activePrompt = null;
                }

                // Reset visual toggle
                if (this.layout?.setDebtButtonActive) {
                    this.layout.setDebtButtonActive(false);
                }

                // Update debt button state
                if (this.layout?.updateDebtButtonState) {
                    this.layout.updateDebtButtonState(player);
                }
            },
            'debt',
            this.getPlayerName(index),
            player.color
        );

        this.activePrompt = promptRef;

        // Visually indicate button is toggled
        if (this.layout?.setDebtButtonActive) {
            this.layout.setDebtButtonActive(true);
        }
    }


    endGame() {
        // Calculate net worth = capital + 1.5 × debt
        const netWorths = this.players.map((p, i) => ({
            name: this.getPlayerName(i),
            value: this.players[i].capital + 1.5 * this.players[i].debt
        }));

        const maxWorth = Math.max(...netWorths.map(nw => nw.value));
        const winners = netWorths.filter(nw => nw.value === maxWorth);

        let message;
        if (winners.length === 1) {
            message = `${winners[0].name} wins with net worth ${maxWorth}!`;
        } else {
            const names = winners.map(w => w.name).join(', ');
            message = `Tie! ${names} share the win with ${maxWorth} net worth!`;
        }

        // ❌ Stop all interaction
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();
        if (this.activePrompt) {
            this.activePrompt.destroy();
            this.activePrompt = null;
        }

        // ✅ Overlay
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8)
            .setOrigin(0)
            .setDepth(999);

        // ✅ "Game Over"
        this.add.text(this.cameras.main.centerX, 200, 'GAME OVER', fontStyle(50, { fill: '#ffffff' }))
            .setOrigin(0.5)
            .setDepth(1000);

        // ✅ Winner message
        this.add.text(this.cameras.main.centerX, 280, message, fontStyle(26, { fill: '#ffffcc' }))
            .setOrigin(0.5)
            .setDepth(1000);

        // ✅ Restart button
        const restartBtn = this.add.text(this.cameras.main.centerX, 360, 'Restart Game', fontStyle(28, {
            fill: '#ffffff',
            backgroundColor: '#444',
            padding: { x: 20, y: 10 }
        }))
        .setOrigin(0.5)
        .setInteractive()
        .setDepth(1000);

        restartBtn.on('pointerdown', () => {
            this.scene.restart();
        });
    }


    isStartOfRound() {
        return this.currentPlayerIndex === 0;
    }
        


    createEventDebugger() {
        // Only create once
        if (document.getElementById('event-debugger')) return;

        const container = document.createElement('div');
        container.id = 'event-debugger';
        container.style.position = 'absolute';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.padding = '15px';
        container.style.backgroundColor = '#111';
        container.style.border = '1px solid #999';
        container.style.color = '#eee';
        container.style.fontFamily = 'JetBrains Mono, monospace';
        container.style.zIndex = 1000;
        container.style.maxWidth = '480px';

        container.innerHTML = `
            <h3 style="margin: 0 0 10px; font-size: 16px;">Beneficial Event Tester (H)</h3>
            <p style="font-size: 12px;">Press A–E to trigger:</p>
            <ol id="event-list" style="font-size: 16px; line-height: 1.5;"></ol>
            <button id="close-debugger" style="margin-top: 10px;">Close</button>
        `;

        document.body.appendChild(container);

        const list = container.querySelector('#event-list');

        const keys = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?', 'A', 'S'];

        const beneficialEvents = this.cache.custom.beneficialEvents || [];

        beneficialEvents.forEach((event, i) => {
            const li = document.createElement('li');
            li.textContent = `[${keys[i]}] ${event.name} → ${event.description}`;
            list.appendChild(li);
        });

        // Key press handler
        const keyHandler = (e) => {
            const idx = keys.indexOf(e.key.toUpperCase());
            if (idx >= 0 && beneficialEvents[idx]) {
            const ev = beneficialEvents[idx];
            const msg = applyEvent(this, this.currentPlayer, this.currentPlayerIndex, ev);

            // 🔧 Update project UI if changed
            this.layout.updatePlayerCapital(this.currentPlayerIndex, this.currentPlayer.capital);
            this.layout.updatePlayerProjects(this.currentPlayerIndex, this.currentPlayer.activeProjects);

            // 🔧 Push message to UI
            this.layout.updateMsg(msg);

            }

            this.layout.updatePlayerWaivers(this.currentPlayerIndex, this.currentPlayer.tariffWaivers);
        };

        // Close button
        document.getElementById('close-debugger').onclick = () => {
            document.removeEventListener('keydown', keyHandler);
            container.remove();
        };

        document.addEventListener('keydown', keyHandler);
        }



        showManual() {
        // Instruction content (can be a string or multiline text)
        const manualMessage = `
        ~ Objective

            Reach square 100 before your opponents by rolling the dice.

        ~ How to Play 

            Roll the dice to move forward. The number you roll determines how many squares you move.


        ~ Special Tiles

            Ladders: Invest capital to climb the ladder and move ahead. The more you invest, the further
            you climb. You can skip the ladder if you choose not to invest.

            Snakes: Fall back to a lower square. You can hedge to reduce the penalty. All projects will 
            be destroyed if u decide not to hedge

            Tariff: Move back 3 squares or use a tariff waiver to avoid them.

            Sanctions: The player with the highest net worth moves back 5 squares.

            Events: Trigger random effects that can help or hinder players.


        ~ Winning the Game

            The first player to reach square 100 wins the game. If multiple players reach the end, the 
            player with the highest net worth (capital + 1.5 × debt) will win.

            Good luck and have fun!
    `;

        new ManualPromptBox(this, manualMessage, () => {
            console.log("Manual closed.");
        });
    }


                     
}




