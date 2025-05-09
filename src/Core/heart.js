const {
    proto,
    getContentType
} = require('@whiskeysockets/baileys')

const heart = (Cypher, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys =
  (m.id.startsWith('BAE5') && m.id.length === 16) ||
  (m.id.startsWith('3EBO') && m.id.length === 22) ||
  (!m.id.startsWith('3EBO') && m.id.length === 22) ||
  (m.id.length !== 32 && m.id.length !== 20);
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = Cypher.decodeJid(m.fromMe && Cypher.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = Cypher.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
      m.body = m.message.conversation || 
         (m.msg && m.msg.caption) || 
         (m.msg && m.msg.text) || 
         (m.mtype == 'listResponseMessage' && m.msg && m.msg.singleSelectReply?.selectedRowId) || 
         (m.mtype == 'buttonsResponseMessage' && m.msg && m.msg.selectedButtonId) || 
         (m.mtype == 'viewOnceMessage' && m.msg && m.msg.caption) || 
         m.text;
let quoted = m.quoted = (m.msg && m.msg.contextInfo) ? m.msg.contextInfo.quotedMessage : null;
m.mentionedJid = (m.msg && m.msg.contextInfo) ? m.msg.contextInfo.mentionedJid || [] : [];

if (m.quoted) {
    try {
        let type = getContentType(quoted);
        if (m.quoted[type]) {
            m.quoted = m.quoted[type];
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted);
                m.quoted = m.quoted[type];
            }
            if (typeof m.quoted === 'string') {
                m.quoted = { text: m.quoted };
            }
            m.quoted.mtype = type;

            if (m.msg && m.msg.contextInfo) {
                m.quoted.id = m.msg.contextInfo.stanzaId;
                m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
                m.quoted.sender = Cypher.decodeJid(m.msg.contextInfo.participant);
                m.quoted.fromMe = m.quoted.sender === (Cypher.user && Cypher.user.id);
                m.quoted.mentionedJid = m.msg.contextInfo.mentionedJid || [];
            } else {
                m.quoted.id = null;
                m.quoted.chat = m.chat;
                m.quoted.sender = null;
                m.quoted.fromMe = false;
                m.quoted.mentionedJid = [];
            }

            m.quoted.isBaileys = m.quoted.id
  ? m.quoted.id.startsWith('BAE5') || 
    m.quoted.id.startsWith('3EBO') && m.quoted.id.length === 22 || 
    (!m.quoted.id.startsWith('3EBO') && m.quoted.id.length === 22) ||
    (m.quoted.id.length !== 32 && m.quoted.id.length !== 20)
  : false;
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';

            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false;
                let q = await store.loadMessage(m.chat, m.quoted.id, Cypher);
                return heart(Cypher, q, store);
            };

            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id,
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {}),
            });

            m.quoted.delete = () => Cypher.sendMessage(m.quoted.chat, {
                delete: vM.key,
            });

            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => Cypher.copyNForward(jid, vM, forceForward, options);

            m.quoted.download = () => Cypher.downloadMediaMessage(m.quoted);
        }
    } catch (error) {
        console.error('Error handling quoted message:', error);
    }
}
    }
    if (m.msg && m.msg.url) {
    m.download = () => Cypher.downloadMediaMessage(m.msg);
}

m.text = m.msg ? (m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || '') : '';
    /**
     * Reply to this message
     * @param {String|Object} text 
     * @param {String|false} chatId 
     * @param {Object} options 
     */
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? Cypher.sendMedia(chatId, text, 'file', '', m, {
        ...options
    }) : Cypher.sendText(chatId, text, m, {
        ...options
    })
    /**
     * Copy this message
     */
    m.copy = () => heart(Cypher, M.fromObject(M.toObject(m)))

    /**
     * 
     * @param {*} jid 
     * @param {*} forceForward 
     * @param {*} options 
     * @returns 
     */
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => Cypher.copyNForward(jid, m, forceForward, options)

    return m
}

module.exports = { heart }