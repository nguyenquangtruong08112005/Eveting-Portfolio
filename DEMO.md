# Demo script (≈3 minutes)

## 0. Start

```bash
cd server
npm run local:infra
npm run db:migrate
npm run dev
```

```bash
cd web
npm run dev
```

Open web: `http://localhost:3000` (or your Next port).

## 1. Attendee path

1. Register / login  
2. Browse events  
3. Open event → buy ticket (sandbox / Zalo if configured)  
4. My tickets → show QR  

## 2. Organizer path

1. Login as organizer  
2. Create / submit event  
3. Admin approve (if needed)  
4. Check-in via organizer app / scanner  

## 3. API sanity

```bash
cd server
npm run db:smoke:order-foundation
npm run db:audit:orphans
```

## Notes

- Folder names: prefer `server/`, `web/`, `mobile-attendee/`, `mobile-organizer/` (see NAMING.md).  
- Web remake + mobile redesign are **next** after bug bash.  
