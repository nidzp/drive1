Patch: Force Vercel to build client/ and pick dist
==================================================
Ovaj patch dodaje `builds` u vercel.json da Vercel UVEK gradi iz `client/`
i traži output u `client/dist`, bez oslanjanja na Project Settings.
To rešava grešku: "No Output Directory named 'dist' found..."

Primena:
  patch -p0 < patches/vercel_force_client_build.patch

Napomene:
- Posle primene, u Vercel logu će se pojaviti warning da Project Settings
  nisu primenjive. To je očekivano (pošto je sve definisano u vercel.json).
- Ne moraš da setuješ Root Directory. Samo redeploy.
