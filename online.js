/* Powiedz na P! – pokoje online z Firebase Cloud Firestore.
 * Plik działa wyłącznie po uzupełnieniu firebase-config.js.
 * Samo otwarcie gry bez Firebase pozostawia lokalną tablicę wyników.
 */
(async function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const createButton = $('roomCreate');
  const joinButton = $('roomJoin');
  const joinInput = $('roomJoinInput');
  const notice = $('roomNotice');
  const setup = $('roomSetupRow');
  const active = $('roomActiveRow');
  const head = $('roomHead');
  const codeLabel = $('roomActiveCode');
  const bridge = window.PScoreBridge;
  const config = window.P_FIREBASE_CONFIG;
  const validRoomCode = code => /^[A-Z2-9]{16}$/.test(code);
  let roomCode = null, stopWatching = null, firebase = null;
  const info = message => { notice.textContent = message; };
  const normalise = (list) => Array.isArray(list) ? list.slice(0, 6).map(p => ({
    id:String(p.id || ''), name:String(p.name || '').slice(0, 24),
    points:Math.max(0, Math.min(999999, Math.trunc(Number(p.points)||0)))
  })).filter(p => p.id && p.name.trim()) : [];
  const roomUrl = code => {
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set('room', code);
    return url.href;
  };
  function showRoom(code) {
    roomCode = code;
    setup.hidden = true;
    active.hidden = false;
    head.textContent = 'Wspólna punktacja • pokój online';
    codeLabel.textContent = 'KOD: ' + code;
    history.replaceState(null, '', roomUrl(code));
  }
  function showLocal() {
    if (stopWatching) { stopWatching(); stopWatching=null; }
    roomCode = null;
    setup.hidden=false;
    active.hidden=true;
    head.textContent='Punktacja na różnych telefonach';
    const url = new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    bridge.leaveRoom();
  }
  function messageFromError(error) {
    const type = String(error?.code||'');
    if (type.includes('permission-denied')) return 'Brak dostępu. Sprawdź reguły bazy Firestore i włącz anonimowe logowanie.';
    if (type.includes('unavailable')) return 'Brak połączenia z internetem lub bazą. Spróbuj ponownie.';
    if (type.includes('auth/')) return 'Nie można połączyć anonimowego logowania. Włącz Anonymous w Firebase Authentication.';
    return 'Nie udało się połączyć z pokojem. ' + String(error?.message||'').slice(0,140);
  }
  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map(b=>chars[b%chars.length]).join('');
  }
  if (!config || !config.apiKey || !config.projectId || !config.appId) {
    info('Pokoje online są przygotowane, ale wymagają jednorazowego połączenia projektu Firebase. Punktacja lokalna działa normalnie.');
    return;
  }
  try {
    info('Łączenie z bazą wyników…');
    const root = 'https://www.gstatic.com/firebasejs/11.10.0/';
    const [appMod, authMod, dbMod] = await Promise.all([
      import(root + 'firebase-app.js'),
      import(root + 'firebase-auth.js'),
      import(root + 'firebase-firestore.js')
    ]);
    const app = appMod.initializeApp(config);
    const auth = authMod.getAuth(app);
    await authMod.signInAnonymously(auth);
    const db = dbMod.getFirestore(app);
    firebase = {
      collectionDoc: code => dbMod.doc(db,'rooms',code),
      setDoc: dbMod.setDoc,
      updateDoc: dbMod.updateDoc,
      onSnapshot: dbMod.onSnapshot,
      runTransaction: dbMod.runTransaction,
      serverTimestamp: dbMod.serverTimestamp,
      db
    };
    createButton.disabled=false;
    joinButton.disabled=false;
    info('Gotowe. Utwórz pokój lub wpisz jego kod. Wszystkie telefony zobaczą te same wyniki.');
  } catch(error) {
    info(messageFromError(error));
    return;
  }
  async function joinRoom(code) {
    const id=String(code||'').toUpperCase().replace(/[\s-]/g,'').trim();
    if (!validRoomCode(id)) {info('Kod pokoju powinien mieć 16 znaków. Możesz też otworzyć otrzymany link.');return;}
    if(stopWatching){stopWatching();stopWatching=null;}
    info('Łączenie z pokojem ' + id + '…');
    const docRef=firebase.collectionDoc(id);
    let hadData=false;
    stopWatching=firebase.onSnapshot(docRef,snapshot=>{
      if(!snapshot.exists()){
        if(!hadData){info('Nie znaleziono pokoju o podanym kodzie.');}
        else {info('Pokój nie jest już dostępny.');}
        showLocal();return;
      }
      hadData=true;
      showRoom(id);
      bridge.receiveRoom(normalise(snapshot.data().players));
      info('Wyniki są synchronizowane z innymi telefonami na żywo. Każdy z linkiem może zmieniać punkty.');
    }, error=>{
      showLocal();
      info(messageFromError(error));
    });
  }
  createButton.addEventListener('click',async ()=>{
    createButton.disabled=true;info('Tworzenie pokoju…');
    const players=normalise(bridge.getPlayers());
    try {
      const code=randomCode();
      await firebase.setDoc(firebase.collectionDoc(code),{
        players,
        createdAt:firebase.serverTimestamp(),
        updatedAt:firebase.serverTimestamp()
      });
      joinInput.value=code;
      await joinRoom(code);
    } catch(error) {info(messageFromError(error));}
    finally {createButton.disabled=false;}
  });
  joinButton.addEventListener('click',()=>joinRoom(joinInput.value));
  joinInput.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();joinRoom(joinInput.value);}
  });
  $('roomLeave').addEventListener('click',()=>{
    showLocal();
    info('Wrócono do wyników zapisanych na tym telefonie. Pokój online nadal istnieje.');
  });
  $('roomShare').addEventListener('click',async()=>{
    if(!roomCode)return;
    const url=roomUrl(roomCode);
    try{
      if(navigator.share) {
        await navigator.share({title:'Powiedz na P! – wspólny pokój',text:'Dołącz do naszego pokoju i zobacz wspólną punktację.',url});
        return;
      }
      if(navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        info('Link do pokoju skopiowany. Wyślij go znajomym.');
        return;
      }
      window.prompt('Skopiuj link do pokoju:',url);
    }catch(error){
      if(error?.name!=='AbortError')window.prompt('Skopiuj link do pokoju:',url);
    }
  });
  async function mutate(transform) {
    if(!roomCode){info('Najpierw dołącz do pokoju.');return;}
    const ref=firebase.collectionDoc(roomCode);
    try {
      await firebase.runTransaction(firebase.db,async tx=>{
        const snap=await tx.get(ref);
        if(!snap.exists())throw new Error('Pokój nie istnieje.');
        const current=normalise(snap.data().players);
        const updated=transform(current);
        if(updated === false)return;
        tx.update(ref,{players:updated,updatedAt:firebase.serverTimestamp()});
      });
    }catch(error){info(messageFromError(error));}
  }
  window.PRoom={
    addPlayer(name){
      const clean=String(name||'').trim().replace(/\s+/g,' ').slice(0,24);
      if(!clean)return;
      return mutate(list=>{
        if(list.length>=6){info('W pokoju jest już sześć osób.');return false;}
        if(list.some(p=>p.name.toLocaleLowerCase('pl')===clean.toLocaleLowerCase('pl'))){info('Gracz o takim imieniu już istnieje.');return false;}
        list.push({id:'p'+crypto.randomUUID().replaceAll('-','').slice(0,18),name:clean,points:0});
        return list;
      });
    },
    rename(id,name){
      const clean=String(name||'').trim().replace(/\s+/g,' ').slice(0,24);
      if(!clean){info('Imię nie może być puste.');return;}
      return mutate(list=>{
        const p=list.find(p=>p.id===id);if(!p)return false;
        if(list.some(x=>x.id!==id&&x.name.toLocaleLowerCase('pl')===clean.toLocaleLowerCase('pl'))){info('To imię jest już zajęte.');return false;}
        p.name=clean;return list;
      });
    },
    change(id,action){
      return mutate(list=>{
        const index=list.findIndex(p=>p.id===id);
        if(index<0)return false;
        if(action==='plus')list[index].points=Math.min(999999,list[index].points+1);
        else if(action==='minus')list[index].points=Math.max(0,list[index].points-1);
        else if(action==='remove')list.splice(index,1);
        else return false;
        return list;
      });
    },
    reset(){return mutate(list=>list.map(p=>({...p,points:0}))); }
  };
  const fromLink=new URL(location.href).searchParams.get('room');
  if(fromLink)joinRoom(fromLink);
})();
