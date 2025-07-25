import { fontStyle } from '../fonts.js';

export default class Board {
    constructor(scene) {
        this.scene = scene;
        this.tiles = [];
        this.specialTiles = this.buildSpecialTiles();

        // --------------------------------------------------
        // 3-column layout
        // --------------------------------------------------

        const W = this.scene.cameras.main.width;
        const H = this.scene.cameras.main.height;

        // Adjusted column widths (20% / 60% / 20%)
        const leftW = W * 0.15;  
        const rightW = W * 0.20; 
        const middleW = W - leftW - rightW; // Middle column width

        // Reduce the board size to 90% of the middle column width
        const boardPixelW = middleW * 0.70; 
        const tileSize = boardPixelW / 10; // Tile size based on the reduced board width

        // Centre board in the *middle* column
        this.offsetX = leftW + (middleW - boardPixelW) / 2;
        this.offsetY = (H - 10 * tileSize) / 2;
        this.tileSize = tileSize;





        // 🖼️ Background board image (with opacity and blend mode)
        const bg = scene.add.image(this.offsetX + (tileSize * 5), this.offsetY + (tileSize * 5), 'boardBackground')
            .setDisplaySize(tileSize * 10.5, tileSize * 10.5)
            .setAlpha(1)                  // ⬅️ Opacity between 0 (invisible) and 1 (fully visible)
            .setDepth(0);                  // ⬅️ Send behind all tiles

        // Optional: Set blend mode (e.g., for soft overlay effect)
        bg.setBlendMode(Phaser.BlendModes.NORMAL);  // Options: NORMAL, MULTIPLY, SCREEN, etc.

        

        // --------------------------------------------------
        // 2. Build 100 tiles and numbers
        // --------------------------------------------------
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const squareNumber = row * 10 + col + 1;
                const effectiveCol = (row % 2 === 0) ? col : 9 - col;

                const x = this.offsetX + effectiveCol * tileSize;
                const y = this.offsetY + (9 - row) * tileSize;



                


                // // tile background
                // const tile = scene.add.rectangle(
                //     x + tileSize / 2,
                //     y + tileSize / 2,
                //     tileSize,
                //     tileSize,
                //     0x333333
                // ).setStrokeStyle(4, 0x23242d);

                // tile number
                if (squareNumber === 1) {
                    // Show "Start" instead of 1
                    scene.add.text(
                        x + 6, y + 4, 'Start',
                        fontStyle(tileSize * 0.22, { fill: '#ffffff' })
                    ).setDepth(2).setAlpha(0.9);
                } else if (squareNumber !== 100) {
                    // Show numbers for 2–99 only
                    scene.add.text(
                        x + 6, y + 4, squareNumber,
                        fontStyle(tileSize * 0.25)
                    ).setDepth(2).setAlpha(0.8);
                }
                // 👈 Do NOT render anything if squareNumber is 100

                    // colour specials
                    // const special = this.specialTiles[squareNumber];
                    // if (special) {
                    //     if (special.type === 'event') {
                    //         // Place the thunder icon for event type instead of a yellow square
                    //         this.scene.add.image(x + tileSize / 2, y + tileSize / 2, 'thunderIcon')
                    //             .setOrigin(0.5, 0.5)  // Center the image
                    //             .setScale(window.innerWidth / 4100).setAlpha(0.75);       // Adjust the scale as needed
                    //     } else {
                    //         const colours = {
                    //             ladder: 0x118848,
                    //             snake:  0xcc3333,
                    //             tariff: 0xcc7700,
                    //             sanction: 0x550055,
                    //         };
                    //         tile.setFillStyle({
                    //             ladder: 0x118848,
                    //             snake:  0x970627,
                    //             tariff: 0xcc7700,
                    //             sanction: 0x550055
                    //         }[special.type]);
                    //     }
                    // }

                    const special = this.specialTiles[squareNumber];
                    if (special) {
                        if (special.type === 'event') {
                            this.scene.add.image(x + tileSize / 2, y + tileSize / 2, 'eventIcon')
                                .setOrigin(0.5)
                                .setDisplaySize(tileSize * 0.95, tileSize * 0.95)
                                .setAlpha(0.8);
                        } else if (special.type === 'tariff') {
                            this.scene.add.image(x + tileSize / 2, y + tileSize / 2, 'tariffIcon')
                                .setOrigin(0.5)
                                 .setDisplaySize(tileSize * 0.95, tileSize * 0.95)
                                .setAlpha(0.75);
                        } else if (special.type === 'sanction') {
                            this.scene.add.image(x + tileSize / 2, y + tileSize / 2, 'sanctionIcon')
                                .setOrigin(0.5)
                                 .setDisplaySize(tileSize * 0.95, tileSize * 0.95)
                                .setAlpha(0.8);
                        } else if (special.type === 'ladder') {
                            this.scene.add.image(x + tileSize / 2, y + tileSize / 2, 'ladderIcon')
                                .setOrigin(0.5)
                                .setDisplaySize(tileSize * 0.95, tileSize * 0.95)
                                .setAlpha(1);
                        } else {
                            this.scene.add.image(x + tileSize / 2, y + tileSize / 2, 'snakeIcon')
                                .setOrigin(0.5)
                                .setDisplaySize(tileSize * 0.95, tileSize * 0.95)
                                .setAlpha(0.8);
                        }
                        

                        
                    } else if (squareNumber === 100) {  
                            this.scene.add.image(x + tileSize / 2, y + tileSize / 2, 'goalIcon')
                                .setOrigin(0.5)
                                .setDisplaySize(tileSize * 0.95, tileSize * 0.95)
                                .setDepth(30)
                                .setAlpha(1);
                    }



                    this.tiles[squareNumber] = {
                        x: x + tileSize / 2,
                        y: y + tileSize / 2
                    };
                }
            }

        // --------------------------------------------------
        // 3. Draw ladders & snakes
        // --------------------------------------------------
        Object.entries(this.specialTiles).forEach(([from, info]) => {
            if (!info.to) return;
            const start = this.tiles[from];
            const end   = this.tiles[info.to];

            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const len  = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
            const ang  = Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y);

            const colour = info.type === 'ladder' ? 0x00ff00 : 0xff0000;
            scene.add.rectangle(midX, midY, 4 * this.tileSize / 50, len, colour, 0.4)
                     .setRotation(ang + Math.PI / 2);
        });
    }

    buildSpecialTiles() {
        return {
                10:  { type: 'ladder', to: 13, delta: 3 },   
                22: { type: 'ladder', to: 26, delta: 4 },    // Mid-game
                37: { type: 'ladder', to: 42, delta: 5 },    
                29: { type: 'ladder', to: 32, delta: 3 }, 
                50: { type: 'ladder', to: 55, delta: 5 },     // Late game
                67: { type: 'ladder', to: 75, delta: 8 },    // Late game, post-80
                71: { type: 'ladder', to: 86, delta: 15 },    // Very late game, post-80
                59: { type: 'ladder', to: 64, delta: 5 },    // Late game

                // Snakes
                17: { type: 'snake', to: 5,  delta: -12 },    // Early game
                28: { type: 'snake', to: 9, delta: -19 },    // Late game
                31: { type: 'snake', to: 14, delta: -17 },    // Mid-game
                48: { type: 'snake', to: 26, delta: -22 },    // Mid-game
                58: { type: 'snake', to: 39, delta: -19 },    // Mid-game
                65: { type: 'snake', to: 46, delta: -19 },     // Mid-game
                88: { type: 'snake', to: 73, delta: -15 },    // Late game
                99: { type: 'snake', to: 63, delta: -36 },    // Late game, post-80

                // Events
                7: { type: 'event' },   // Early game
                25: { type: 'event' },   // Mid-game
                43: { type: 'event' },   // Mid-game   
                61: { type: 'event' }, 
                69: { type: 'event' },  // Late game
                76: { type: 'event' },   // Near endgame
                87: { type: 'event' },   // Near endgame
                96: { type: 'event' },

                // Tariffs
                23: { type: 'tariff' },  // Early game
                34: { type: 'tariff' },  // Mid-game
                62: { type: 'tariff' },  // Late game
                72: { type: 'tariff' },  // Late game, post-80
                83: { type: 'tariff' },  // Post-80, right before endgame

                // Sanctions
                18: { type: 'sanction' },  // Early game
                45: { type: 'sanction' },  // Mid-game
                68: { type: 'sanction' },  // Late game
                79: { type: 'sanction' },
                91: { type: 'sanction' },   // Very late game, final stretch

        };
    }

    // returns the centre pixel of a square
    centreOf(squareIdx) {
        return this.tiles[squareIdx + 1];
    }
}