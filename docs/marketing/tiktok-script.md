# TwinFlow — script TikTok

**Durée :** 38 secondes  
**Format :** vertical 9:16, 1080×1920  
**Rythme :** une idée toutes les 4–6 secondes, coupes nettes  
**Langue :** français  
**Liens :** [github.com/Donchaminade/twinflow](https://github.com/Donchaminade/twinflow) · [twinflow-eosin.vercel.app](https://twinflow-eosin.vercel.app)

Tourner la landing, le film produit (simulation sous charge) et le simulateur. Pas de plans resto, pas de stock café.

---

## Deux accroches (choisir une)

### Accroche A — le diagnostic

- **À l’écran :** TON POSTGRES N’EST PAS TROP LENT. IL EST TROP SOLLICITÉ.
- **Voix off :** Ton Postgres n’est pas trop lent. Il est trop sollicité.
- **Image :** Gros plan sur une jauge de trafic qui grimpe. Fond ink, cuivre. Visage hors champ ou cut-in 0,4 s.

### Accroche B — le contraste

- **À l’écran :** UN PIC. ZÉRO SESSION EN PLUS SUR LE PRIMARY.
- **Voix off :** Un pic de lectures. Zéro nouvelle session sur le primary.
- **Image :** Paquets qui affluent vers TwinFlow, puis se séparent : haut = miroir, bas = Postgres.

---

## Timeline (38 s)

### 0–3 s — Accroche

Jouer **A** ou **B**. Texte plein écran, 2 lignes max, sans logo.

### 3–10 s — Le problème

- **À l’écran :** UN PIC OUVRE TROP DE SESSIONS. POSTGRES LÂCHE.
- **Voix off :** Sous un pic, l’app ouvre des sessions. La file n’existe pas. Le primary lâche.
- **Image :** Courbe de connexions qui explose. Écran sombre, chiffres cuivre trop hauts, puis cut.

### 10–16 s — Une phrase

- **À l’écran :** TWINFLOW. SIDECAR DEVANT POSTGRES.
- **Voix off :** TwinFlow s’intercale devant Postgres. Un binaire, une config, n’importe quel langage.
- **Image :** Hero de la landing. Mot-marque + point cuivre. Superposer : HTTP JSON · ~1 s · WRITES → PRIMARY.

### 16–22 s — Beat 1 : le pic

- **À l’écran :** PIC → LECTURES SUR LE MIROIR
- **Voix off :** Le pic tape le miroir. Postgres n’ouvre pas une session par requête.
- **Image :** Film ou simulateur : jauge « Pic de trafic » qui se remplit. SQL `SELECT … FROM accounts` et `sessions`, badge **miroir**.

### 22–28 s — Beat 2 : le régulateur

- **À l’écran :** WRITES EN FILE. RATE-LIMIT. 429 SI PLEIN.
- **Voix off :** Les écritures attendent dans la file. Rate-limit sur le primary. File pleine : 429, pas un nouveau pool.
- **Image :** Jauges « File d’écriture » et « Rate-limit primary ». SQL `INSERT INTO ledger_entries`, badge **primary**.

### 28–33 s — Beat 3 : miroir vs primary

- **À l’écran :** FRESH + WRITES → PRIMARY. LE RESTE → MIROIR.
- **Voix off :** Les tables fresh et toutes les writes vont au primary. Le reste lit le miroir, synchronisé en une seconde.
- **Image :** Schéma App → TwinFlow → Miroir / Primary. Badge **sync ~1 s**. Si le miroir retarde : badge **failover**.

### 33–36 s — Pas un métier

- **À l’écran :** PAS UN OUTIL CAFÉ. N’IMPORTE QUEL SCHÉMA.
- **Voix off :** Ce n’est pas un logiciel de restauration. Accounts, factures, events : vous branchez votre schéma.
- **Image :** Section « Pas lié à un métier ». YAML `users` / `invoices` / `events`. Ne pas montrer le café.

### 36–38 s — Appel

- **À l’écran :** GITHUB.COM/DONCHAMINADE/TWINFLOW  
  TWINFLOW-EOSIN.VERCEL.APP
- **Voix off :** Open source. Lien en bio.
- **Image :** Logo TwinFlow centré, fond ink. URLs en bas, lisibles 2 secondes. Musique coupe net.

---

## Voix off d’un trait (accroche A)

Ton Postgres n’est pas trop lent. Il est trop sollicité.  
Sous un pic, l’app ouvre des sessions. La file n’existe pas. Le primary lâche.  
TwinFlow s’intercale devant Postgres. Un binaire, une config, n’importe quel langage.  
Le pic tape le miroir. Postgres n’ouvre pas une session par requête.  
Les écritures attendent dans la file. Rate-limit sur le primary. File pleine : 429, pas un nouveau pool.  
Les tables fresh et toutes les writes vont au primary. Le reste lit le miroir, synchronisé en une seconde.  
Ce n’est pas un logiciel de restauration. Accounts, factures, events : vous branchez votre schéma.  
Open source. Lien en bio.

## Voix off d’un trait (accroche B)

Un pic de lectures. Zéro nouvelle session sur le primary.  
Sous la charge, l’app ouvre trop de sessions. Le primary lâche.  
TwinFlow s’intercale devant Postgres. Un binaire, une config, n’importe quel langage.  
Le pic tape le miroir. Postgres n’ouvre pas une session par requête.  
Les écritures attendent dans la file. Rate-limit sur le primary. File pleine : 429, pas un nouveau pool.  
Les tables fresh et toutes les writes vont au primary. Le reste lit le miroir, synchronisé en une seconde.  
Ce n’est pas un logiciel de restauration. Accounts, factures, events : vous branchez votre schéma.  
Open source. Lien en bio.

---

## Consignes image

- Palette landing : fond ink / ardoise, accents cuivre et teal.
- Texte à l’écran : 6 à 8 mots, capitales, centré, jamais collé aux bords.
- Plans utiles : landing, section simulation (film + simulateur), section schéma, hero.
- Interdit : tables de café, images de restaurant, écran YouTube, terminal illisible.
- Sous-titres brûlés : oui. Musique basse, voix nette.

## Légende de publication

TwinFlow — sidecar devant Postgres. Les pics tapent le miroir. Les writes restent sur le primary. N’importe quel schéma, n’importe quel langage.

github.com/Donchaminade/twinflow  
twinflow-eosin.vercel.app
