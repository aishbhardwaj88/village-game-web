import * as THREE from 'three';
import { pt } from '../anchors.js';
import { buildBantaCart, buildChaatThela } from './props.js';

/**
 * Pocket money can be spent at the banta shop, the kulfiwala (src/jobs/kulfi.js) and the chaat thela (docs/MISSIONS_PLAN.md
 * section 2). Two fixed carts with a seller each; a small menu, a bilingual line, the price comes out of `quest.pocket`.
 * Never punishing: with too little money the seller just smiles and says come back later.
 */
export function openMenu(api, { seller, items, greeting }) {
  api.say([{ en: greeting.en, hi: greeting.hi }], () => {
    api.modal({
      en: seller.en,
      hi: seller.hi,
      build: (body) => {
        const p = document.createElement('p');
        p.className = 'job-line';
        p.innerHTML = `<span class="jl-en">Pocket money: Rs ${api.quest.pocket}</span><span class="jl-hi">जेब खर्च: ₹${api.quest.pocket}</span>`;
        body.appendChild(p);
      },
      buttons: [
        ...items.map((it) => ({
          en: `${it.en} — Rs ${it.price}`,
          hi: `${it.hi} — ₹${it.price}`,
          onClick: (ctrl) => {
            ctrl.close();
            if (api.quest.pocket < it.price) {
              api.say([{ en: 'Come back when you have a few more rupees, beta. No hurry!', hi: 'थोड़े और पैसे हो जाएँ तब आना, बेटा। कोई जल्दी नहीं!' }]);
              return;
            }
            api.addPocket(-it.price);
            api.say([{ en: it.line.en, hi: it.line.hi }], () => it.after?.());
          },
        })),
        { en: 'Not now', hi: 'अभी नहीं', secondary: true, onClick: (ctrl) => ctrl.close() },
      ],
    });
  });
}

const STALLS = [
  {
    id: 'banta',
    seller: { en: 'Banta shop', hi: 'बंटा की दुकान' },
    role: 'bantawala',
    build: buildBantaCart,
    pos: { x: pt('banta').x - 0.2, z: pt('banta').z },
    rotY: 0, // handle toward +x (the lane)
    buyAt: { x: pt('banta').x + 1.6, z: pt('banta').z + 0.4 },
    greeting: { en: 'Ice-cold banta, fresh jaljeera! What will it be?', hi: 'ठंडा बंटा, ताज़ा जलजीरा! क्या लोगे?' },
    items: [
      { en: 'Lemon banta', hi: 'नींबू बंटा', price: 8, line: { en: 'Pop! The marble drops and the banta fizzes — sweet, sour, cold.', hi: 'पॉप! कंचा गिरा और बंटा फिस्स — मीठा, खट्टा, ठंडा।' } },
      { en: 'Jaljeera', hi: 'जलजीरा', price: 5, line: { en: 'Tangy, minty jaljeera — your whole face puckers and smiles.', hi: 'चटपटा, पुदीने वाला जलजीरा — चेहरा सिकुड़ा भी, मुस्कुराया भी।' } },
    ],
  },
  {
    id: 'chaat',
    seller: { en: 'Chaat thela', hi: 'चाट का ठेला' },
    role: 'chaatwala',
    build: buildChaatThela,
    pos: { x: -62.8, z: 50.5 },
    rotY: 0,
    buyAt: { x: -60.8, z: 50.9 },
    greeting: { en: 'Hot aloo tikki, crisp papdi! Tell me what you like.', hi: 'गरम आलू टिक्की, कुरकुरी पापड़ी! बोलो क्या चाहिए।' },
    items: [
      { en: 'Aloo tikki', hi: 'आलू टिक्की', price: 15, line: { en: 'A hot tikki with tamarind chutney — crunchy outside, soft inside.', hi: 'इमली की चटनी वाली गरम टिक्की — बाहर कुरकुरी, अंदर नरम।' } },
      { en: 'Papdi chaat', hi: 'पापड़ी चाट', price: 20, line: { en: 'Papdi, curd, chutney — a little of everything, all at once.', hi: 'पापड़ी, दही, चटनी — सब थोड़ा-थोड़ा, एक साथ।' } },
      { en: 'Golgappe (six)', hi: 'गोलगप्पे (छह)', price: 10, line: { en: 'Six golgappes, six little explosions of spicy water!', hi: 'छह गोलगप्पे, मसालेदार पानी के छह छोटे धमाके!' } },
    ],
  },
];

export function registerStalls(api, env) {
  for (const s of STALLS) {
    const cart = s.build();
    cart.position.set(s.pos.x, 0, s.pos.z);
    cart.rotation.y = s.rotY;
    api.scene.add(cart);
    const seller = api.npc(s.role, { x: s.pos.x - 1.1, z: s.pos.z }, Math.PI / 2, `npc_${s.id}_seller`);
    seller.root.position.y = 0;
    api.addInteraction({
      id: `stall_${s.id}`,
      position: new THREE.Vector3(s.buyAt.x, 0, s.buyAt.z),
      radius: 2.4,
      priority: 1,
      label: { en: `Buy from the ${s.seller.en.toLowerCase()}`, hi: `${s.seller.hi} से खरीदें` },
      onInteract: () => {
        api.discoverJob; // (stalls are map places, not jobs)
        openMenu(api, { seller: s.seller, items: s.items, greeting: s.greeting });
      },
    });
  }
}
