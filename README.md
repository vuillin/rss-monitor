# rss-monitor

Petit dashboard pour recuperer et afficher des articles depuis des flux RSS.

## Structure

```txt
rss-monitor/
├─ public/              # Fichiers envoyes au navigateur
│  ├─ assets/           # Logos et images statiques
│  ├─ feeds.js          # Liste des sources RSS affichees
│  ├─ app.js            # Rendu de l'interface
│  ├─ index.html
│  └─ styles.css
├─ samples/             # Extraits RSS pour debug/tests manuels
├─ src/server/          # Serveur HTTP, fichiers statiques, parser RSS
├─ server.js            # Point d'entree Node
└─ server.ps1           # Lancement avec le Node portable
```

## Lancer le projet

node portable dans `C:\Users\STAGE 2025\tools\node` :

```powershell
.\server.ps1
```

Puis ouvrir :

```txt
http://localhost:3000
```

## Ajouter un flux

Modifier `public/feeds.js`, puis ajouter le logo dans `public/assets/` si besoin.
