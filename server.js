

var ws = require("nodejs-websocket")

var topScores = [{
    name: "Matt Urtnowski",
    science: 84,
    tickCount: 6
}];
var server = ws.createServer(function (conn) {
    console.log("Server Connection");
    //console.log(conn);

    conn.on("close", function (code, reason) {
		console.log("Connection Close " + code + " " + reason);
        if(conn.game.tick) {
            clearTimeout(conn.game.tick);
            conn.game.tick = null;
        };
	});

    conn.on("error", function (err) {
		console.log("Connection Error");
        console.log(err);
	});

	conn.on("text", function (str) {
		console.log("Received: " + str);

        if(typeof str === "string") {
            if(conn.game.mode === "TITLE") {
                if(str.match(/^HELP$/i)) {
                    conn.sendText(JSON.stringify({
                        type: "NOTIFICATION",
                        clear: true,
                        data: "The ship's modules will automatically make resources while they are online.  Crew members can be assigned to a module to increase its output.  The output drops as the health of the module falls.  Crew members can be assigned to repair the health of a module.  As the oxygen level drops, so does the crew's ability to work.  Don't let your crew be over taken by space maddess or they will not listening to you.<br><br>If you are truely desperate try emailing Murtnowski@gmail.com"
                    }));
                } else if(str.match(/^STATS$/i)) {
                    var text = "TOP SCORE<table><tbody>";
                    for(var i = 0; i < topScores.length; i++)
                    {
                        text += "<tr><td>" + topScores[i].name + "</td><td>" + topScores[i].science.toFixed(2) + "</td><td>" + topScores[i].tickCount + " Days</td></tr>";
                    }
                    text += "</tbody></table>";

                    conn.sendText(JSON.stringify({
                        type: "NOTIFICATION",
                        clear: true,
                        data: text
                    }));
                } else if(str.match(/^CREDITS$/i)) {
                    conn.sendText(JSON.stringify({
                        type: "NOTIFICATION",
                        clear: true,
                        data: "Matt Urtnowski"
                    }));
                } else if(str.match(/^START$/i)) {
                    conn.game.mode = "GAME";
                    conn.sendText(JSON.stringify({
                        type: "NOTIFICATION",
                        clear: true,
                        data: null
                    }));
                    conn.sendText(JSON.stringify({
                        type: "COMMANDS",
                        data: [
                            "ASSIGN (1-4) JOB    (e.g. ASSIGN 1 FOOD, ASSIGN 2 SCIENCE)",
                            "REPAIR (1-4) MODULE (e.g. REPAIR 1 POWER, ASSIGN 4 OXYGEN)",
                            "MODULE (ON|OFF)     (e.g. POWER ON, OXYGEN OFF)",
                            "SPEED (0-9)         (Adjust speed of simulation.  0 is slow, 9 is fast)",
                            "P(AUSE)             (Pause the simulation)",
                            "R(ESUME)            (Resume the simulation)",
                            "RESET               (Reset the simulation)"
                        ]
                    }));
                    conn.game.tick = setTimeout(tick, 0);
                } else {
                    //Unknown Command
                    conn.sendText(JSON.stringify({
                        type: "PROMPT",
                        ttl: 3000,
                        data: "INVALID COMMAND"
                    }));
                }
            } else if(conn.game.mode === "GAME") {
                if(str.match(/^RESET$/i)) {
                    //Reset
                    if(conn.game.tick != null) {
                        clearTimeout(conn.game.tick);
                        conn.game.tick = null;
                    }
                    startGame();
                } else if(str.match(/^(P|PAUSE)$/i)) {
                    //Pause
                    if(conn.game.tick != null) {
                        clearTimeout(conn.game.tick);
                        conn.game.tick = null;
                    }

                    conn.sendText(JSON.stringify({
                        type: "TICK",
                        data: {
                            tickCount: conn.game.tickCount,
                            speed: conn.game.speed,
                            paused: conn.game.tick == null
                        }
                    }));
                } else if(str.match(/^(R|RESUME)$/i)) {
                    //Resume
                    if(conn.game.tick == null) {
                        conn.game.tick = setTimeout(tick, 0);
                    }
                    conn.sendText(JSON.stringify({
                        type: "TICK",
                        data: {
                            tickCount: conn.game.tickCount,
                            speed: conn.game.speed,
                            paused: conn.game.tick == null
                        }
                    }));
                } else if(str.match(/^SPEED \d$/i)) {
                    //Adjust Game Speed 0 - 9
                    conn.game.speed = str.charAt(str.length - 1);
                    if(conn.game.tick != null) {
                        clearTimeout(conn.game.tick);
                        conn.game.tick = setTimeout(tick, 0);
                    }
                } else if(str.match(/^REPAIR (1|2|3|4) (POWER|FOOD|WATER|OXYGEN|SCIENCE)$/i)) {
                    var input = str.split(" ");
                    if(conn.game.players[input[1] - 1].health > 0 && conn.game.players[input[1] - 1].morale > 20)
                    {
                        conn.game.players[input[1] - 1].job = "REPAIR " + input[2].toUpperCase();

                        conn.sendText(JSON.stringify({
                            type: "PLAYERS",
                            data: conn.game.players
                        }));
                    }
                } else if(str.match(/^ASSIGN (1|2|3|4) (NONE|AID|GAMES|FOOD|WATER|SCIENCE)$/i)) {
                    var input = str.split(" ");
                    if(conn.game.players[input[1] - 1].health > 0 && conn.game.players[input[1] - 1].morale > 20)
                    {
                        if(input[2].match(/^NONE$/i)) {
                            conn.game.players[input[1] - 1].job = "NONE";
                        } else if(input[2].match(/^AID$/i)) {
                            conn.game.players[input[1] - 1].job = "AID";
                        } else if(input[2].match(/^GAMES$/i)) {
                            conn.game.players[input[1] - 1].job = "GAMES";
                        } else if(input[2].match(/^FOOD$/i) && conn.game.generators.food.online) {
                            conn.game.players[input[1] - 1].job = "FOOD";
                        } else if(input[2].match(/^WATER$/i) && conn.game.generators.water.online) {
                            conn.game.players[input[1] - 1].job = "WATER";
                        } else if(input[2].match(/^SCIENCE$/i) && conn.game.generators.science.online) {
                            conn.game.players[input[1] - 1].job = "SCIENCE";
                        }

                        conn.sendText(JSON.stringify({
                            type: "PLAYERS",
                            data: conn.game.players
                        }));
                    }
                } else if(str.match(/^(POWER|FOOD|WATER|OXYGEN|SCIENCE) (ON|OFF)$/i)) {
                    var input = str.split(" ");
                    var online = input[1].match(/^ON$/i);

                    if(input[0].match(/^POWER$/i)) {
                        conn.game.generators.power.online = online;
                    } else if(input[0].match(/^FOOD$/i)) {
                        conn.game.generators.food.online = online;
                    } else if(input[0].match(/^WATER$/i)) {
                        conn.game.generators.water.online = online;
                    } else if(input[0].match(/^OXYGEN$/i)) {
                        conn.game.generators.oxygen.online = online;
                    } else if(input[0].match(/^SCIENCE$/i)) {
                        conn.game.generators.science.online = online;
                    }

                    for(var i = 0; i < conn.game.players.length; i++) {
                        if(input[0].match(/^FOOD$/i) && conn.game.players[i].job == "FOOD") {
                            conn.game.players[i].job = "NONE";
                        } else if(input[0].match(/^WATER$/i) && conn.game.players[i].job == "WATER") {
                            conn.game.players[i].job = "NONE";
                        } else if(input[0].match(/^SCIENCE$/i) && conn.game.players[i].job == "SCIENCE") {
                            conn.game.players[i].job = "NONE";
                        }
                    }

                    conn.sendText(JSON.stringify({
                        type: "PLAYERS",
                        data: conn.game.players
                    }));

                    var jobs = [
                        "NONE     (Rests crew member)",
                        "AID      (Heals crew)",
                        "GAMES    (Improves crew morale)"
                    ];

                    if(conn.game.generators.food.online) {
                        jobs.push("FOOD     (Generates food)");
                    }

                    if(conn.game.generators.water.online) {
                        jobs.push("WATER    (Generates water)");
                    }

                    if(conn.game.generators.science.online) {
                        jobs.push("SCIENCE  (Generates science)");
                    }

                    conn.sendText(JSON.stringify({
                        type: "JOBS",
                        data: jobs
                    }));

                    conn.sendText(JSON.stringify({
                        type: "GENERATORS",
                        data: conn.game.generators
                    }));
                } else {
                    //Unknown Command
                    conn.sendText(JSON.stringify({
                        type: "PROMPT",
                        ttl: 3000,
                        data: "INVALID COMMAND"
                    }));
                }
            } else if(conn.game.mode === "GAMEOVER") {
                if(str.match(/^CONTINUE$/i)) {
                    //Handle Top Score
                    conn.game.mode = "ENTERNAME";

                    conn.sendText(JSON.stringify({
                        type: "COMMANDS",
                        data: [
                            "Enter your name to record your score"
                        ]
                    }));
                } else {
                    //Unknown Command
                    conn.sendText(JSON.stringify({
                        type: "PROMPT",
                        ttl: 3000,
                        data: "INVALID COMMAND"
                    }));
                }
            } else if(conn.game.mode === "ENTERNAME") {
                    topScores.push({
                        name: str,
                        science: conn.game.resources.science,
                        tickCount: conn.game.tickCount
                    });

                    topScores = topScores.sort(function(a, b) {
                        return a.science - b.science;
                    }).slice(0, 10);

                    conn.game.mode = "TITLE";

                    conn.sendText(JSON.stringify({
                        type: "COMMANDS",
                        data: [
                            "HELP",
                            "STATS",
                            "CREDITS",
                            "START"
                        ]
                    }));

                    var text = "This simulation: " + conn.game.resources.science.toFixed(2) + " SCIENCE " + conn.game.tickCount + " DAYS<br>TOP SCORE<table><tbody>";
                    for(var i = 0; i < topScores.length; i++)
                    {
                        text += "<tr><td>" + topScores[i].name + "</td><td>" + topScores[i].science.toFixed(2) + " SCIENCE</td><td>" + topScores[i].tickCount + " DAYS</td></tr>";
                    }
                    text += "</tbody></table>";

                    conn.sendText(JSON.stringify({
                        type: "NOTIFICATION",
                        clear: true,
                        data: text
                    }));
                    startGame();
                }
        } else {
            //Invalid Data
            conn.sendText(JSON.stringify({
                type: "PROMPT",
                ttl: 3000,
                data: "0xF4"
            }));
        }
	});

	conn.on("connect", function() {
		console.log("Client Connection");
	});

    var tick = function() {
        console.log("Tick");
        var initPlayers = JSON.parse(JSON.stringify(conn.game.players));
        var initResources = conn.game.resources;
        conn.game.tickCount++;

        if(conn.game.generators.power.online) {
            conn.game.resources.power += Math.floor(conn.game.generators.power.health / 100 * 35);
        }

        if(conn.game.generators.food.online) {
            conn.game.resources.food += Math.floor(conn.game.generators.food.health / 100 * 15);
            conn.game.resources.power -= 5;
        }

        if(conn.game.generators.water.online) {
            conn.game.resources.water += Math.floor(conn.game.generators.water.health / 100 * 15);
            conn.game.resources.power -= 5;
        }

        if(conn.game.generators.oxygen.online) {
            conn.game.resources.oxygen += Math.floor(conn.game.generators.oxygen.health / 100 * 15);
            conn.game.resources.power -= 5;
        }

        if(conn.game.generators.science.online) {
            conn.game.resources.science += Math.floor(conn.game.generators.science.health / 100 * 15);
            conn.game.resources.power -= 5;
        }

        conn.game.resources.power -= 10;

        var hasAid = false;
        var hasGames = false;
        for(var i = 0; i < conn.game.players.length; i++) {
            if(conn.game.players[i].health > 0) {
                conn.game.resources.food -= 10;
                conn.game.resources.water -= 10;
                conn.game.resources.oxygen -= (1 + ((100 - conn.game.players[i].morale) / 100));
                conn.game.resources.power -= 1;

                if(conn.game.players[i].morale > 20) {
                    if(conn.game.players[i].job === "AID") {
                        hasAid = true;
                        for(var j = 0; j < conn.game.players.length; j++) {
                            if(conn.game.players[j].health > 0) {
                                conn.game.players[j].health += 4;
                                conn.game.players[j].morale += 1;
                                conn.game.resources.water -= 3;
                                conn.game.resources.food -= 1;
                            }
                        }
                    } else if(conn.game.players[i].job === "GAMES") {
                        hasGames = true;
                        for(var j = 0; j < conn.game.players.length; j++) {
                            if(conn.game.players[j].health > 0) {
                                conn.game.players[j].morale += 5;
                                conn.game.resources.water -= 2;
                                conn.game.resources.food -= 1;
                            }
                        }
                    }
                }
            }
        }

        for(var i = 0; i < conn.game.players.length; i++) {
            if(!hasAid) {
                if(!hasGames) {
                    conn.game.players[i].morale -= (2 + ((100 - conn.game.players[i].health) / 100) * 2);
                }
                conn.game.players[i].health -= (1 + ((100 - conn.game.resources.oxygen) / 100));
            }
        }

        for(var i = 0; i < conn.game.players.length; i++) {
            if(conn.game.players[i].health > 0) {
                if(conn.game.players[i].morale > 20) {
                    if(conn.game.players[i].job === "NONE") {
                        conn.game.players[i].health += 1;
                        conn.game.players[i].morale += 1;
                    } else if(conn.game.players[i].job === "SCIENCE" && conn.game.generators.science.online) {
                        conn.game.resources.science += (conn.game.resources.oxygen / 100 * 20);
                        conn.game.generators.science.health -= 1;
                    } else if(conn.game.players[i].job === "REPAIR FOOD") {
                        conn.game.generators.food.health += (conn.game.resources.oxygen / 100 * 10);
                    } else if(conn.game.players[i].job === "REPAIR WATER") {
                        conn.game.generators.water.health += (conn.game.resources.oxygen / 100 * 10);
                    } else if(conn.game.players[i].job === "REPAIR OXYGEN") {
                        conn.game.generators.oxygen.health += (conn.game.resources.oxygen / 100 * 10);
                    } else if(conn.game.players[i].job === "REPAIR POWER") {
                        conn.game.generators.power.health += (conn.game.resources.oxygen / 100 * 10);
                    } else if(conn.game.players[i].job === "REPAIR SCIENCE") {
                        conn.game.generators.science.health += (conn.game.resources.oxygen / 100 * 10);
                    } else if(conn.game.players[i].job === "FOOD" && conn.game.generators.food.online) {
                        conn.game.resources.food += (conn.game.resources.oxygen / 100 * 20);
                        conn.game.generators.food.health -= 1;
                    } else if(conn.game.players[i].job === "WATER" && conn.game.generators.water.online) {
                        conn.game.resources.water += (conn.game.resources.oxygen / 100 * 20);
                        conn.game.generators.water.health -= 1;
                    }
                }
            }
        }

        if(conn.game.generators.power.online) {
            conn.game.generators.power.health -= 2;
        } else {
            conn.game.generators.power.health -= 1;
        }

        if(conn.game.generators.food.online) {
            conn.game.generators.food.health -= 2;
        } else {
            conn.game.generators.food.health -= 1;
        }

        if(conn.game.generators.water.online) {
            conn.game.generators.water.health -= 2;
        } else {
            conn.game.generators.water.health -= 1;
        }

        if(conn.game.generators.oxygen.online) {
            conn.game.generators.oxygen.health -= 2;
        } else {
            conn.game.generators.oxygen.health -= 1;
        }

        if(conn.game.generators.science.online) {
            conn.game.generators.science.health -= 2;
        } else {
            conn.game.generators.science.health -= 1;
        }

        for(var i = 0; i < conn.game.players.length; i++) {
            if(conn.game.resources.food <= 0) {
                conn.game.players[i].health -= 5;
                conn.game.players[i].morale -= 10;
            }

            if(conn.game.resources.water <= 0) {
                conn.game.players[i].health -= 10;
                conn.game.players[i].morale -= 20;
            }

            if(conn.game.resources.oxygen <= 0) {
                conn.game.players[i].health = 0;
                conn.game.players[i].morale = 0;
            } else if(conn.game.resources.oxygen <= 10) {
                conn.game.players[i].health -= 8;
                conn.game.players[i].morale -= 10;
            } else if(conn.game.resources.oxygen <= 20) {
                conn.game.players[i].health -= 4;
                conn.game.players[i].morale -= 5;
            }
        }

        for(var i = 0; i < conn.game.players.length; i++) {
            if(conn.game.players[i].health > 0 && conn.game.players[i].morale <= 20) {
                //SPACE MADNESS
                if(initPlayers[i].morale > 20) {
                    conn.sendText(JSON.stringify({
                        type: "NOTIFICATION",
                        clear: false,
                        data: "CREW " + (i + 1) + " HAS BEEN AFFLICTED WITH SPACE MADNESS"
                    }));
                }
                conn.game.players[i].job = "None";
                conn.game.players[i].status = "Crazy";
                var maddnessStatus = [];
                
                if(Math.random() > 0.7) {
                    var flavorInterestSeaking = Math.floor((Math.random() * 9));
                            
                    switch(flavorInterestSeaking) {
                        case 0:
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + ": \"YOU'RE NOT MY SUPERVISOR!\""
                            }));
                            break;
                        case 1:
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + ": \"WE ARE ALL GOING TO DIE!\""
                            }));
                            break;
                        case 2:
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + ": \"There is a snake in my boots.\""
                            }));
                            break;
                        case 3:
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + ": \"Can someone please crack a window.\""
                            }));
                            break;
                        case 4:
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + ": \"I need scissors! 61!\""
                            }));
                            break;
                        case 5:
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + ": \"La li lu le lo\""
                            }));
                            break;
                        case 6:
                            conn.game.generators.oxygen.online = !conn.game.generators.oxygen.online;
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + " flipped the switch on the oxygen module"
                            }));
                            break;
                        case 7:
                            conn.game.generators.power.online = !conn.game.generators.power.online;
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + " flipped the switch on the power module"
                            }));
                            break;
                        case 8:
                            conn.game.generators.food.online = !conn.game.generators.food.online;
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + " flipped the switch on the food module"
                            }));
                            break;
                        case 9:
                            conn.game.generators.water.online = !conn.game.generators.water.online;
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + " flipped the switch on the water module"
                            }));
                            break;
                        case 10:
                            conn.game.generators.science.online = !conn.game.generators.science.online;
                            conn.sendText(JSON.stringify({
                                type: "NOTIFICATION",
                                clear: false,
                                data: "CREW " + (i + 1) + " flipped the switch on the science module"
                            }));
                            break;
                    }
                    
                }
            } else if(conn.game.players[i].health <= 0) {
                conn.game.players[i].job = "Corpse";
                conn.game.players[i].status = "Dead";
                if(initPlayers[i].health > 0) {
                    conn.sendText(JSON.stringify({
                        type: "NOTIFICATION",
                        clear: false,
                        data: "CREW " + (i + 1) + " HAS DIED"
                    }));
                }
            } else {
                conn.game.players[i].status = "Alive";
                
                if(Math.random() > 0.7) {
                    
                    var flavorInterest = Math.floor((Math.random() * 6));
                    
                    switch(flavorInterest) {
                        case 0: 
                            if(conn.game.generators.power.health < 20) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"The Solar panels are all, but gone!\""
                                }));
                            } else if(conn.game.generators.power.health < 40) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"The Solar panels are badly in need of repair.\""
                                }));
                            } else if(conn.game.generators.power.health < 60) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"The Solar panels need some help.\""
                                }));
                            } else if(conn.game.generators.power.health < 80) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"The Solar panels are a little dirty.\""
                                }));
                            } else {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"Solar panels are in great shape.\""
                                }));
                            }
                            break;
                        case 1: 
                            if(conn.game.players[i].health < 80 && conn.game.resources.food <= 0) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"I'm starving.\""
                                }));
                            } else if(conn.game.resources.food <= 0) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"I'm so hungry.\""
                                }));
                            }
                            break;
                        case 2: 
                            if(conn.game.players[i].health < 80 && conn.game.resources.water <= 0) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"I'd kill for a glass of water.\""
                                }));
                            } else if(conn.game.resources.water <= 0) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"I'm so thirsty.\""
                                }));
                            }
                        break;
                        case 3: 
                            if(conn.game.resources.oxygen < 20) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"We need air NOW!\""
                                }));
                            } else if(!conn.game.generators.oxygen.online && conn.game.resources.oxygen < 40) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"For God's sake ED-209!  Turn the oxygen back on.\""
                                }));
                            } else if(!conn.game.generators.oxygen.online && conn.game.resources.oxygen < 60) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"Can you please turn the oxygen back on?\""
                                }));
                            } else if(conn.game.resources.oxygen < 60) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"The oxygen is a little thin.\""
                                }));
                            }
                            break;
                        case 4: 
                            if(conn.game.generators.science.online) {
                                conn.sendText(JSON.stringify({
                                    type: "NOTIFICATION",
                                    clear: false,
                                    data: "CREW " + (i + 1) + ": \"Hey ED-209, we are in a lot of danger.  Now is not the time for Science.\""
                                }));
                            }
                            break;
                        case 5: 
                            var flavorInterestSeaking = Math.floor((Math.random() * 7));
                            
                            switch(flavorInterestSeaking) {
                                case 0:
                                    var offset = Math.floor((Math.random() * conn.game.players.length));
                                    for(var j = 0; j < conn.game.players.length; j++) {
                                        if(conn.game.players[(j + offset) % conn.game.players.length].health <= 0) {
                                            conn.sendText(JSON.stringify({
                                                type: "NOTIFICATION",
                                                clear: false,
                                                data: "CREW " + (i + 1) + ": \"I miss " + conn.game.players[((j + offset) % conn.game.players.length)].name + "\""
                                            }));
                                            j = conn.game.players.length;
                                        } else if(conn.game.players[(j + offset) % conn.game.players.length].health <= 20) {
                                            conn.sendText(JSON.stringify({
                                                type: "NOTIFICATION",
                                                clear: false,
                                                data: "CREW " + (i + 1) + ": \"Hang in there " + conn.game.players[((j + offset) % conn.game.players.length)].name + "\""
                                            }));
                                            j = conn.game.players.length;
                                        }
                                    }
                                    break;
                                case 1:
                                    conn.sendText(JSON.stringify({
                                        type: "NOTIFICATION",
                                        clear: false,
                                        data: "CREW " + (i + 1) + ": \"We have names you know.  Mine is " + conn.game.players[i].name + "\""
                                    }));
                                    break;
                                case 2:
                                    conn.sendText(JSON.stringify({
                                        type: "NOTIFICATION",
                                        clear: false,
                                        data: "CREW " + (i + 1) + ": \"Never give up, never surrender!\""
                                    }));
                                    break;
                                case 3:
                                    conn.sendText(JSON.stringify({
                                        type: "NOTIFICATION",
                                        clear: false,
                                        data: "CREW " + (i + 1) + ": \"I want to go home.\""
                                    }));
                                    break;
                                case 4:
                                    conn.sendText(JSON.stringify({
                                        type: "NOTIFICATION",
                                        clear: false,
                                        data: "CREW " + (i + 1) + ": \"If only we had a beryllium sphere.\""
                                    }));
                                    break;
                                case 5:
                                    conn.sendText(JSON.stringify({
                                        type: "NOTIFICATION",
                                        clear: false,
                                        data: "CREW " + (i + 1) + ": \"As the oxygen level drops so does our productivity\""
                                    }));
                                    break;
                                case 6:
                                    conn.sendText(JSON.stringify({
                                        type: "NOTIFICATION",
                                        clear: false,
                                        data: "CREW " + (i + 1) + ": \"The worse shape a module is in, the less resources it will produce.\""
                                    }));
                                    break;
                            }
                            break;
                    }
                }
            }
        }

        conn.game.resources.power = Math.max(0, conn.game.resources.power);
        conn.game.resources.food = Math.max(0, conn.game.resources.food);
        conn.game.resources.water = Math.max(0, conn.game.resources.water);
        conn.game.resources.oxygen = Math.min(100, Math.max(0, conn.game.resources.oxygen));

        conn.game.generators.power.health = Math.min(100, Math.max(0, conn.game.generators.power.health));
        conn.game.generators.food.health = Math.min(100, Math.max(0, conn.game.generators.food.health));
        conn.game.generators.water.health = Math.min(100, Math.max(0, conn.game.generators.water.health));
        conn.game.generators.oxygen.health = Math.min(100, Math.max(0, conn.game.generators.oxygen.health));
        conn.game.generators.science.health = Math.min(100, Math.max(0, conn.game.generators.science.health));

        for(var i = 0; i < conn.game.players.length; i++) {
            conn.game.players[i].health = Math.min(100, Math.max(0, conn.game.players[i].health));
            conn.game.players[i].morale = Math.min(100, Math.max(0, conn.game.players[i].morale));
        }

        conn.sendText(JSON.stringify({
            type: "RESOURCES",
            data: conn.game.resources
        }));

        conn.sendText(JSON.stringify({
            type: "GENERATORS",
            data: conn.game.generators
        }));

        conn.sendText(JSON.stringify({
            type: "PLAYERS",
            data: conn.game.players
        }));

        var jobs = [
            "NONE     (Rests crew member)",
            "AID      (Heals crew)",
            "GAMES    (Improves crew morale)"
        ];

        if(conn.game.generators.food.online) {
            jobs.push("FOOD     (Generates food)");
        }

        if(conn.game.generators.water.online) {
            jobs.push("WATER    (Generates water)");
        }

        if(conn.game.generators.science.online) {
            jobs.push("SCIENCE  (Generates science)");
        }

        conn.sendText(JSON.stringify({
            type: "JOBS",
            data: jobs
        }));

        conn.sendText(JSON.stringify({
            type: "TICK",
            data: {
                tickCount: conn.game.tickCount,
                speed: conn.game.speed,
                paused: conn.game.tick == null
            }
        }));

        if(conn.game.resources.power <= 0) {
            //GAME OVER
            conn.game.mode = "GAMEOVER";
            conn.sendText(JSON.stringify({
                type: "NOTIFICATION",
                clear: false,
                data: "GAME OVER - Your power has gone out."
            }));
            conn.sendText(JSON.stringify({
                type: "COMMANDS",
                data: [
                    "CONTINUE"
                ]
            }));
            clearTimeout(conn.game.tick);
            conn.game.tick = null;
        }

        if(conn.game.tick != null) {
            conn.game.tick = setTimeout(tick, 1000 * (10 - conn.game.speed));
        }
    };

    var startGame = function() {
        conn.game = {
            generators: {
                power: {
                    health: 100,
                    online: true
                },
                food: {
                    health: 100,
                    online: true
                },
                water: {
                    health: 100,
                    online: true
                },
                oxygen: {
                    health: 100,
                    online: true
                },
                science: {
                    health: 100,
                    online: true
                }
            },
            resources: {
                power: 500,
                food: 700,
                water: 1000,
                oxygen: 100,
                science: 0
            },
            players: [
                {
                    health: 100,
                    morale: 100,
                    job: "NONE",
                    status: "Alive",
                    name: "Bob"
                },
                {
                    health: 100,
                    morale: 100,
                    job: "NONE",
                    status: "Alive",
                    name: "Olivia"
                },
                {
                    health: 100,
                    morale: 100,
                    job: "NONE",
                    status: "Alive",
                    name: "Tony"
                },
                {
                    health: 100,
                    morale: 100,
                    job: "NONE",
                    status: "Alive",
                    name: "Ava"
                }
            ],
            speed: 5,
            mode: "TITLE",
            tickCount: 0,
            tick: null
        };

        conn.sendText(JSON.stringify({
            type: "NOTIFICATION",
            clear: true,
            data: "Alert! Alert!<br>An asteroid strike has caused irreparable damaged to space ship Hopper DDG-70.<br>Bays 6, E, Q, U, J, and 5 have been detached.<br>MCP is OFFLINE.<br>Primary Support Systems are OFFLINE.<br><br>In a desperate effort to stay alive the four remaining crew members have retasked you, ED-209, to take control of the remaining systems modules.  Although your original design and purpose was to be the primary computer in charge of science collection, you now have the authority to manage the ship's dwindling resources.  Primary Support Systems were lost in the asteroid strike and only backup systems are available.<br><br>PRIMARY OBJECTIVE:<br>Maximize Science Collection"
        }));

        conn.sendText(JSON.stringify({
            type: "COMMANDS",
            data: [
                "HELP",
                "STATS",
                "CREDITS",
                "START"
            ]
        }));
    };

    startGame();
});

server.on("listening", function() {
    console.log("Server Listening");
});

server.on("close", function() {
    console.log("Server Close");
});

server.on("error", function(error) {
    console.log("Server Error");
    console.log(error);
});

server.listen(8001);
