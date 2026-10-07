import express from "express";import{Client,GatewayIntentBits,EmbedBuilder}from"discord.js";
const app=express();app.use(express.json());
app.get("/apple-touch-icon.png",(q,s)=>{s.set("Cache-Control","no-cache");s.sendFile(process.cwd()+"/public/apple-touch-icon-v9.png")});
app.get("/apple-touch-icon-precomposed.png",(q,s)=>{s.set("Cache-Control","no-cache");s.sendFile(process.cwd()+"/public/apple-touch-icon-v9.png")});
app.get("/favicon.ico",(q,s)=>{s.set("Cache-Control","no-cache");s.sendFile(process.cwd()+"/public/icon-192.png")});
app.get("/manifest.webmanifest",(q,s,n)=>{s.set("Cache-Control","no-store");n()});
app.get("/sw.js",(q,s,n)=>{s.set("Cache-Control","no-store");n()});
app.use(express.static("public"));
const maps=["The Island","The Center","Scorched Earth","Aberration","Extinction","Genesis Part 1","Genesis Part 2","Crystal Isles","Lost Island","Fjordur","Ragnarok","Valguero","Astraeos","Club ARK","Forglar","Amissa","Althemia Magic Ground","Appalachia","Arkis","Arkopolis Free","Atlantis","Bjarnheim","Dark Abyss Dome","Dragon Topía","Eden Premium","EliteArk Arena","EliteArk: Deadzone","Enclave: Survival Skyward","Epiphany","ExtinctionOverGrowth"];
const modules=["Season Pass","Quêtes","Tickets & loterie","Mini-jeux","Banque RP","Shop","Dinos","Ressources","Recettes","Cartes & groupes","IA ARK","Support"];
app.get("/health",(q,s)=>s.json({ok:true,name:"BOT ARK"}));app.get("/api/config",(q,s)=>s.json({maps,modules,languages:["fr","en","us","de","it","es","ru","ko","ja","zh"],discord:"https://discord.gg/53EKbkKvyn"}));
app.post("/api/ai",(q,s)=>{let x=(q.body?.message||"").toLowerCase();let answer=x.includes("tame")||x.includes("apprivo")?"Consulte la fiche du Dino pour sa nourriture, son niveau et les ressources nécessaires.":x.includes("map")||x.includes("carte")?"Ouvre Cartes pour choisir une carte ASA et créer ton groupe.":"Assistant ARK prêt : demande-moi un Dino, une ressource, une recette, une carte ou une quête.";s.json({answer});});
const token=process.env.DISCORD_TOKEN;if(token){const c=new Client({intents:[GatewayIntentBits.Guilds]});c.once("ready",()=>console.log("BOT ARK Discord connecté"));c.on("interactionCreate",async i=>{if(!i.isChatInputCommand())return;if(i.commandName==="ark")await i.reply({embeds:[new EmbedBuilder().setTitle("🦖 BOT ARK").setDescription("Dashboard, cartes, Dinos, ressources, Season Pass, économie RP et outils serveur.").setURL(process.env.PUBLIC_URL||"https://discord.gg/53EKbkKvyn")]});});c.login(token).catch(console.error);}
app.listen(process.env.PORT||3000,"0.0.0.0",()=>console.log("BOT ARK prêt"));