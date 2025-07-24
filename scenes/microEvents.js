// microEvents.js
// ✅ Local & Global Micro Event Logic
import PromptBox from '../ui/PromptBox.js';
import Player from './Player.js';


const microEvents = [
   



  {
        name: "Commodity Boom",
        type: "beneficial",
        description: "Each FDI project gains +1 chip, boosting final profit.",
        effect: (scene, player, index) => {
            if (!player.activeProjects || player.activeProjects.length === 0) {
            return `${scene.getPlayerName(index)} has no FDI projects to boost.`;
            }

            player.activeProjects.forEach(p => {
            p.chips += 1;
            p.profit += p.delta;
            });

            scene.layout.updatePlayerProjects(index, player.activeProjects);

            return `${scene.getPlayerName(index)} boosted all FDI projects!`;
        }
    },

    {
    name: "Lend-Lease Shipment",
    type: "beneficial",
    description: "Gain +3 capital chips instantly.",
    effect: (scene, player, index) => {
        player.capital += 3;
        scene.layout.updatePlayerCapital(index, player.capital);
        return `${scene.getPlayerName(index)} received +3 capital from Lend-Lease Shipment.`;
    }
    },

    {
    name: "Debt Restructure",
    type: "beneficial",
    description: "Remove 1 debt chip (if any).",
    effect: (scene, player, index) => {
        if (player.debt > 0) {
        player.debt -= 1;
        scene.layout.updateDebtLabel(index, player.debt);
        return `${scene.getPlayerName(index)} reduced debt by 1 chip.`;
        } else {
        return `${scene.getPlayerName(index)} has no debt to restructure.`;
        }
    }
    },

    {
        name: "Fast-Track Permit",
        type: "beneficial",
        description: "Payout your FDI project with the lowest TTM — set TTM to 0.",
        effect: (scene, player, index) => {
            const projects = player.activeProjects;

            if (!projects || projects.length === 0) {
            return `${scene.getPlayerName(index)} has no active FDI projects.`;
            }

            // Find project with lowest TTM
            let minTTM = Math.min(...projects.map(p => p.ttm));
            let targetProject = projects.find(p => p.ttm === minTTM);

            if (targetProject.ttm === 0) {
            return `${scene.getPlayerName(index)}'s lowest project is already ready.`;
            }

            // Set TTM to 0 and payout
            targetProject.ttm = 0;
            player.capital += targetProject.profit;

            // Remove project from active list
            player.activeProjects = projects.filter(p => p !== targetProject);

            // Update UI
            scene.layout.updatePlayerCapital(index, player.capital);
            scene.layout.updatePlayerProjects(index, player.activeProjects);

            return `${scene.getPlayerName(index)} fast-tracked a project and gained ${targetProject.profit} chips!`;
        }
    },

    {
    name: "Tariff Truce",
    type: "beneficial",
    description: "Every player gains 1 Tariff Waiver token.",
    effect: (scene, _player, _index) => {
        scene.players.forEach((p, i) => {
        p.tariffWaivers = (p.tariffWaivers || 0) + 1;
        scene.layout.updatePlayerWaivers(i, p.tariffWaivers);
        });
        return `🕊️ Tariff Truce declared — all players gain 1 Tariff Waiver.`;
    }
    },
  {
    name: "Currency Devaluation",
    type: "adverse",
    description: "Lose 3 capital immediately.",
    effect: (scene, player, index) => {
      player.capital = Math.max(0, player.capital - 3);
      scene.layout.updatePlayerCapital(index, player.capital);
      return `${scene.getPlayerName(index)} lost 3 capital due to currency devaluation.`;
    }
  },



  {
    name: "Export Subsidy",
    type: "beneficial",
    description: "Advance your pawn +3 squares, ignoring any tile effects.",
    effect: (scene, player, index) => {
        const newSquare = Math.min(99, player.square + 3);
        player.square = newSquare;
        scene.snapPawnToSquare(newSquare);
        return `${scene.getPlayerName(index)} advanced 3 squares via Export Subsidy!`;
    }
    },
    {
        name: "Productivity Surge",
        type: "beneficial",
        description: "Reduce TTM by 1 on all of your active FDI projects.",
        effect: (scene, player, index) => {
            let changed = 0;
            player.activeProjects.forEach(p => {
                if (p.ttm > 0) {
                    p.ttm--;
                    changed++;
                    if (p.ttm === 0) {
                        // Instant payout on ttm reaching 0
                        player.capital += p.profit;
                        scene.layout.updatePlayerCapital(index, player.capital);
                    }
                }
            });
            scene.layout.updatePlayerProjects(index, player.activeProjects);
            return changed > 0
                ? `${scene.getPlayerName(index)} boosted ${changed} project(s) with faster payout!`
                : `${scene.getPlayerName(index)} has no active FDI projects to boost.`;
        }

    }
,
    {
        name: 'Surplus Budget',
        type: "beneficial",
        description: 'Gain +2 Capital Chips if you have no active FDI projects, otherwise reduce TTM by 1 on all of them.',
        effect: (scene, player, playerIndex) => {
            if (player.activeProjects.length === 0) {
                player.capital += 2;
                scene.layout.updatePlayerCapital(playerIndex, player.capital);
                return `${scene.getPlayerName(playerIndex)} gained +2 Capital Chips for having no active FDI projects.`;
            } else {
                player.activeProjects.forEach(project => {
                    project.ttm = Math.max(0, project.ttm - 1);
                    if (project.ttm === 0) {
                        // Instant payout on ttm reaching 0
                        player.capital += project.profit;
                        scene.layout.updatePlayerCapital(playerIndex, player.capital);
                    }
                });
                scene.layout.updatePlayerProjects(playerIndex, player.activeProjects);
                return `${scene.getPlayerName(playerIndex)} reduced TTM by 1 on all active FDI projects.`;
            }
        }
    }
        ,

    {
    name: "Strategic Reserve Sale",
    type: "beneficial",
    description: "Choose: gain +2 Capital or pay off 1 Debt chip without spending Capital.",
    effect: (scene, player, index) => {
        scene.activePrompt = new PromptBox(
            scene,
            "Strategic Reserve: Choose an option",
            ['Gain 2 🪙', 'Pay 1 💰'],
            (choice) => {
                if (choice === 'Gain 2 🪙') {
                    player.capital += 2;
                    scene.layout.updatePlayerCapital(index, player.capital);
                    scene.layout.updateMsg(`${scene.getPlayerName(index)} gained 2 Capital.`);
                } else if (choice === 'Pay 1 💰' && player.debt > 0) {
                    player.debt -= 1;
                    scene.layout.updateDebtLabel(index, player.debt);
                    scene.layout.updateMsg(`${scene.getPlayerName(index)} paid off 1 Debt without cost.`);
                } else {
                    scene.layout.updateMsg(`${scene.getPlayerName(index)} could not pay off debt.`);
                }

                scene.activePrompt = null;
                scene.unlockTurnAfterDelay(); // ✅ Ensure turn continues after choice
            },
            'buttons',
            scene.getPlayerName(index),
            player.color,
            'default',
            180
        );

        // ❗ Return empty string so GameScene doesn’t override it or misfire
        return '';
    }
}
,
   {
        name: "Allied Aid Convoy",
        type: "beneficial",
        description: "Players behind you move +2. You gain +1 Capital.",
        effect: (scene, player, index) => {
            let moved = 0;
            const currSquare = player.square; // Current player's square
            
            // Loop through all players, but not the current player (the one triggering the event)
            scene.players.forEach((p, i) => {
                // Only move players who are behind the current player (excluding the current player)
                if (i !== index && p.square < currSquare) {
                    // Use moveForwardSteps to move this player forward by 2 squares
                    scene.moveForwardSteps(p, i, 2, () => {
                        moved++; // Increment the moved count once player is moved
                    });
                }
            });

            // Add +1 Capital to the current player (Player 1 in this case)
            player.capital += 1;
            scene.layout.updatePlayerCapital(index, player.capital); // Update capital on the UI

            return `${scene.getPlayerName(index)} aided allies: ${moved} player(s) moved +2, gained 1 Capital.`;
        }
    }




,
    {
    name: "War–Bond Rally",
    type: "beneficial",
    description: "Collect +2 Capital Chips immediately.",
    effect: (scene, player, index) => {
        player.capital += 2;
        scene.layout.updatePlayerCapital(index, player.capital);
        return `${scene.getPlayerName(index)} received 2 Capital from War–Bond Rally.`;
        }
    }

    ,


    {
    name: "Banking Panic",
    type: "adverse",
    description: "Pay 2 Capital or gain 1 Debt chip (your choice).",
    effect: (scene, player, index) => {
        scene.layout.updateMsg(`${scene.getPlayerName(index)}, choose: Pay 2 Capital or gain 1 Debt chip.`);

        // Prompt for choice
        new PromptBox(
            scene,
            `Choose an option:`,
            ['Pay 2 🪙', 'Gain 1 💰'],
            (choice) => {
                if (choice === 'Pay 2 🪙') {
                    if (player.capital >= 2) {
                        player.capital -= 2;
                        scene.layout.updatePlayerCapital(index, player.capital);
                        scene.layout.updateMsg(`${scene.getPlayerName(index)} paid 2 Capital.`);
                    } else {
                        scene.layout.updateMsg(`${scene.getPlayerName(index)} does not have enough Capital to pay 2.`);
                    }
                } else if (choice === 'Gain 1 💰') {
                    player.debt += 1;
                    scene.layout.updateDebtLabel(index, player.debt);
                    scene.layout.updateMsg(`${scene.getPlayerName(index)} gained 1 Debt.`);
                }
                scene.unlockTurnAfterDelay();
            },
            'buttons',
            scene.getPlayerName(index),
            player.color,
            'default', 
            180
        );
    }
},



{
    name: "Cyber Attack",
    type: "adverse",
    description: "Your FDI project with the highest profit loses 5 chips (minimum profit = 0).",
    effect: (scene, player, index) => {
        if (!player.activeProjects || player.activeProjects.length === 0) {
            scene.layout.updateMsg(`${scene.getPlayerName(index)} has no active FDI projects.`);
            return;
        }

        // Find the project with the highest profit
        let highestProfitProject = player.activeProjects.reduce((max, project) => 
            project.profit > max.profit ? project : max
        );

        // Apply damage
        highestProfitProject.profit = Math.max(0, highestProfitProject.profit - 5);
        scene.layout.updatePlayerProjects(index, player.activeProjects);
        scene.layout.updateMsg(`${scene.getPlayerName(index)} suffered a Cyber Attack. The highest profit FDI project lost 5 chips.`);
    }
}
,


{
    name: "Trade Embargo",
    type: "adverse",  // Adverse event
    description: "Skip your next roll (lose one turn).",
    effect: (scene, player, index) => {

        console.log(`${scene.getPlayerName(index)} landed on Trade Embargo event!`);
        // Set willSkipTurn to 1, meaning they will skip their next turn
        player.willSkipTurn = 1;

        // Notify that the player has been affected by the Trade Embargo
        scene.layout.updateMsg(`${scene.getPlayerName(index)} is under a Trade Embargo and must skip their next roll.`);

        return `${scene.getPlayerName(index)} is under a Trade Embargo and must skip their next roll.`;
    }
} ,

{
    name: "Industrial Strike",
    type: "adverse",
    description: "Add +1 TTM to every active FDI project you control.",
    effect: (scene, player, index) => {
        if (!player.activeProjects || player.activeProjects.length === 0) {
            scene.layout.updateMsg(`${scene.getPlayerName(index)} has no active FDI projects.`);
            return;
        }

        // Add +1 TTM to all active projects
        player.activeProjects.forEach(project => {
            project.ttm += 1;
        });
        scene.layout.updatePlayerProjects(index, player.activeProjects);
        scene.layout.updateMsg(`${scene.getPlayerName(index)} suffered an Industrial Strike. All active FDI projects have +1 TTM.`);
    }
},

{
   name: "Sovereign Default",
    type: "adverse",  // Adverse event
    description: "Player with the highest Net Worth immediately moves back 4 tiles.",
    effect: (scene, player, index) => {
        // Calculate the net worth for each player
        const netWorths = scene.players.map((p, i) => ({
            index: i,
            value: p.capital + 1.5 * (p.debt || 0)  // Net worth = Capital + 1.5 * Debt
        }));

        // Find the player(s) with the highest net worth
        const maxNetWorth = Math.max(...netWorths.map(nw => nw.value));
        const highestPlayers = netWorths.filter(nw => nw.value === maxNetWorth).map(nw => nw.index);

        // Get names of players with highest net worth
        const leaderNames = highestPlayers.map(i => scene.getPlayerName(i)).join(', ');

        // Notify that the event has been triggered
        scene.layout.updateMsg(`Sovereign Default hit! Highest net-worth player(s): ${leaderNames} move back 4 tiles.`);

        // Move each highest net-worth player back 4 tiles
        highestPlayers.forEach(playerIndex => {
            const targetPlayer = scene.players[playerIndex];
            scene.moveBackSteps(targetPlayer, playerIndex, 4, () => {
                // Optional: After movement, unlock turn
                scene.unlockTurnAfterDelay();
            });
        });
    }
},

{
    name: "Port Blockade",
    type: "adverse",
    description: "Discard 1 Tariff Waiver. If you have none, lose 1 Capital.",
    effect: (scene, player, index) => {
        if (player.tariffWaivers > 0) {
            player.tariffWaivers--;
            scene.layout.updatePlayerWaivers(index, player.tariffWaivers);
            scene.layout.updateMsg(`${scene.getPlayerName(index)} discarded a Tariff Waiver.`);
        } else {
            player.capital -= 1;
            scene.layout.updatePlayerCapital(index, player.capital);
            scene.layout.updateMsg(`${scene.getPlayerName(index)} lost 1 Capital due to Port Blockade.`);
        }
    }
}
,

{
    name: "Insurance Fraud",
    type: "adverse",
    description: "Hedge cost for your next Market Crash increases by +2 chips.",
    effect: (scene, player, index) => {
        player.insuranceFraud = true;  // Mark the player with the "Insurance Fraud" event
        scene.layout.updateMsg(`${scene.getPlayerName(index)}'s hedge cost for the next Market Crash increases by 2 chips.`);
    }
}
,

{
    name: "Corruption Probe",
    type: "adverse",
    description: "Reveal Capital. The player with the most Capital pays 2 chips to the bank.",
    effect: (scene, player, index) => {
        const netWorths = scene.players.map((p, i) => ({
            index: i,
            capital: p.capital
        }));

        const maxCapital = Math.max(...netWorths.map(nw => nw.capital));
        const richestPlayer = netWorths.find(nw => nw.capital === maxCapital);

        scene.layout.updateMsg(`The player with the most Capital is ${scene.getPlayerName(richestPlayer.index)}.`);
        scene.players[richestPlayer.index].capital -= 2;
        scene.layout.updatePlayerCapital(richestPlayer.index, scene.players[richestPlayer.index].capital);
        scene.layout.updateMsg(`${scene.getPlayerName(richestPlayer.index)} paid 2 Capital to the bank.`);
    }
}

,

{
    name: "Debt Spiral",
    type: "adverse",
    description: "Immediately gain 1 Debt chip. This debt cannot be repaid this round.",
    effect: (scene, player, index) => {
        player.debt += 1;
        scene.layout.updateDebtLabel(index, player.debt);
        scene.layout.updateMsg(`${scene.getPlayerName(index)} gained 1 Debt chip. This debt cannot be repaid this round.`);
        player.cannotRepayDebtThisRound = true;  // Mark the player so they cannot repay this debt
    }
}

,


{
    name: "Sanction Threat",
    type: "adverse",
    description: "Until your next turn, you are treated as the Net Worth leader for any Sanction effect.",
    effect: (scene, player, index) => {
        player.sanctionThreatActive = true;  // Mark the player with the active Sanction Threat
        scene.layout.updateMsg(`${scene.getPlayerName(index)} is treated as the Net Worth leader for any Sanction effects until their next turn.`);
    }
}






        






];

// ✅ New: Global events with turnsLeft & per-turn effects
const globalMicroEvents = [
  {
    name: "Capital Controls",
    type: "adverse",
    description: "Lose 1 capital per turn for 3 turns.",
    turns: 3,
    applyGlobalEffect: (scene, player, index) => {
        if (player.capital > 0) {
        player.capital -= 1;
        scene.layout.updatePlayerCapital(index, player.capital);
        return `${scene.getPlayerName(index)} lost 1 capital due to Capital Controls.`;
        } else {
        return `${scene.getPlayerName(index)} has no capital left to lose from Capital Controls.`;
        }
    }
    },
  {
    name: "Interest Rate Hike",
    type: "adverse",
    description: "All players lose 1 capital at the start of their turn for 3 turns.",
    turns: 3,
    applyGlobalEffect: (scene, player, index) => {
      player.capital = Math.max(0, player.capital - 1);
      scene.layout.updatePlayerCapital(index, player.capital);
      return `${scene.getPlayerName(index)} lost 1 capital due to interest hike.`;
    }
  },

  {
    name: "Commodity Crash",
    type: "adverse",
    description: "All active FDI projects across all players lose 3 chips of profit.",
    turns: 1,  // Global event lasts for one turn
    applyGlobalEffect: (scene, player, index) => {
        player.activeProjects.forEach(project => {
            project.profit = Math.max(0, project.profit - 3);  // Reduce profit, minimum 0
        });
        scene.layout.updatePlayerProjects(index, player.activeProjects);
        scene.layout.updateMsg(`All active FDI projects lose 3 chips of profit due to the Commodity Crash.`);
    }
},

// {
//     name: "Corruption Probe",
//     type: "adverse",
//     description: "Reveal Capital. The player with the most Capital pays 2 chips to the bank.",
//     applyGlobalEffect: (scene, player, index) => {
//         // Reveal capital of all players
//         const playerCapitals = scene.players.map(p => p.capital);
//         const maxCapital = Math.max(...playerCapitals);
//         const richestPlayerIndex = playerCapitals.indexOf(maxCapital);
        
//         // Find the richest player
//         const richestPlayer = scene.players[richestPlayerIndex];

//         // Deduct 2 chips from the richest player
//         if (richestPlayer.capital >= 2) {
//             richestPlayer.capital -= 2;
//             scene.layout.updatePlayerCapital(richestPlayerIndex, richestPlayer.capital);
//             scene.layout.updateMsg(`${scene.getPlayerName(richestPlayerIndex)} paid 2 chips to the bank due to Corruption Probe.`);
//         } else {
//             scene.layout.updateMsg(`${scene.getPlayerName(richestPlayerIndex)} does not have enough Capital to pay the penalty.`);
//         }

//         return `${scene.getPlayerName(richestPlayerIndex)} paid 2 chips to the bank due to Corruption Probe.`;
//     }
// },

// {
//     name: "Sanction Threat",
//     type: "adverse",
//     description: "Until your next turn, you are treated as the Net Worth leader for any Sanction effect.",
//     applyGlobalEffect: (scene, player, index) => {
//         player.isSanctionLeader = true;  // Mark this player as the leader for Sanction effects
//         scene.layout.updateMsg(`${scene.getPlayerName(index)} is now treated as the Net Worth leader for Sanction effects until their next turn.`);
//         return `${scene.getPlayerName(index)} is now treated as the Net Worth leader for Sanction effects.`;
//     }
// },




];


// ✅ Draw a random instant (local) event
export function drawEvent() {
  const i = Phaser.Math.Between(0, microEvents.length - 1);
  return microEvents[i];
}

// ✅ Draw a random global event
export function drawGlobalEvent() {
  const i = Phaser.Math.Between(0, globalMicroEvents.length - 1);
  const base = globalMicroEvents[i];
  return {
    ...base,
    turnsLeft: base.turns,
    affectedIndices: []  // You must assign this in GameScene when triggered
  };
}

// ✅ Apply an instant micro event (returns effect text)
export function applyEvent(scene, player, index, event) {
  if (event && typeof event.effect === 'function') {
    return event.effect(scene, player, index);
  } else {
    console.warn("❌ Invalid event passed to applyEvent");
    return '';
  }
}

// ✅ Apply effects of all active global events
export function applyGlobalEvents(scene, player, index, globalEvents) {
        const results = [];
        globalEvents.forEach(event => {
            if (event.affectedIndices.includes(index)) {
                const outcome = event.applyGlobalEffect(scene, player, index);
                if (outcome) results.push(outcome);
            }

            // Inside the global event logic (in applyGlobalEvents)
            if (event.name === "Trade Corridor Opened" && event.affectedIndices.includes(index)) {
                // Make sure player has extra movement bonus when the event is active
                if (!player.extraMovement) {
                    player.extraMovement = 1; // Give +1 movement
                    player.movementTurnsLeft = event.turns; // Event lasts for 3 turns
                }
            }
        });
        return results;
    }




// ✅ Reduce durations of global events
export function tickGlobalEvents(globalEvents) {
    return globalEvents
        .map(event => {
            // Reduce turns left for each event
            if (event.turnsLeft > 0) {
                event.turnsLeft--;
            }
            return event;
        })
        .filter(event => event.turnsLeft > 0);  // Remove expired events
}




export { microEvents };
export { globalMicroEvents };

export const beneficialEvents = microEvents.filter(e => e.type === 'adverse');