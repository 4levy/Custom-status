// เอาไปแจกต่อให้เครดิตด้วย | Deobf by 4levy ใครเปลี่ยนขอให้ไม่เจอดี

// revere engineer

require("colors");
const { Client: DiscordClient, CustomStatus, Options } = require("discord.js-selfbot-v13");
const moment = require("moment-timezone");
const { schedule } = require("node-cron");
const config = require('./setup/config.json');
const os = require('os');
const fetch = require('node-fetch');

function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, 1000 * seconds));
}

function createInterval(fn, delay) {
    return setInterval(fn, delay);
}

class Weather {
    constructor() {
        const setupConfig = config.setup || {};
        
        this.countryDefaults = {
            "Australia": "Sydney",
            "USA": "New York",
            "UK": "London",
            "Japan": "Tokyo",
            "China": "Beijing",
            "Vietnam": "Ho Chi Minh City",
            // Add more country-city mappings as needed
        };

        this.location = this.processLocation(setupConfig.city || "Pattaya");
        this.updateDelay = (setupConfig.delay || 5) * 60000;
        this.stop = 0;
        this.timezone = "Asia/Bangkok";
        this.retryDelay = 5000;
        this.maxRetries = 3;
        console.log(`[+] Using location: ${this.location}`);
        console.log(`[+] Update interval: ${this.updateDelay/60000} minutes`);
        this.update();
    }

    processLocation(input) {
        if (!input) return "Bangkok"; 
        
        const defaultCity = this.countryDefaults[input];
        if (defaultCity) {
            console.log(`[!] ${input} is a country. Using ${defaultCity} as the default city.`);
            return defaultCity;
        }
        
        return input; 
    }

    async update() {
        try {
            const params = new URLSearchParams({
                key: "1e1a0f498dbf472cb3991045241608",
                q: encodeURIComponent(this.location),
                aqi: "yes"
            });
            const response = await fetch(`https://api.weatherapi.com/v1/current.json?${params}`);
            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }
            const data = await response.json();
            if (!data.location || !data.current) {
                throw new Error("Invalid API response format");
            }

            this.timezone = data.location.tz_id;
            this.localtime = data.location.localtime;
            this.localtime_epoch = data.location.localtime_epoch;
            
            this.city = data.location.name;
            this.region = data.location.region;
            this.country = data.location.country;
            
            this.temp_c = data.current.temp_c;
            this.temp_f = data.current.temp_f;
            this.wind_kph = data.current.wind_kph;
            this.wind_mph = data.current.wind_mph;
            this.wind_degree = data.current.wind_degree;
            this.wind_dir = data.current.wind_dir;
            this.pressure_mb = data.current.pressure_mb;
            this.pressure_in = data.current.pressure_in;
            this.precip_mm = data.current.precip_mm;
            this.precip_in = data.current.precip_in;
            this.gust_kph = data.current.gust_kph;
            this.gust_mph = data.current.gust_mph;
            this.vis_km = data.current.vis_km;
            this.vis_mi = data.current.vis_miles;
            this.humidity = data.current.humidity;
            this.cloud = data.current.cloud;
            this.uv = data.current.uv;
            this.pm2_5 = data.current.air_quality.pm2_5;
            this.condition = data.current.condition?.text;

            const formattedTime = moment.tz(this.localtime, this.timezone).format('YYYY-MM-DD HH:mm:ss');
            console.log(`[+] Weather updated for ${this.city}, ${this.country} | ${this.temp_c}°C | Local time: ${formattedTime}`);
            
            this.stop = 0;
            setTimeout(() => this.update(), this.updateDelay);
            
        } catch (error) {
            console.error(`[-] Weather update failed: ${error.message}`);
            if (this.stop < this.maxRetries) {
                this.stop++;
                console.log(`[*] Retrying in ${this.retryDelay/1000} seconds... (Attempt ${this.stop}/${this.maxRetries})`);
                setTimeout(() => this.update(), this.retryDelay);
            } else {
                console.log(`[-] Max retries reached. Using default values.`);
                this.temp_c = "N/A";
                this.temp_f = "N/A";
                this.condition = "Unknown";
                this.localtime = "N/A";
            }
        }
    }

    getLocalTime() {
        return moment.tz(this.localtime, this.timezone).format('YYYY-MM-DD HH:mm:ss');
    }
}

class SystemInfo {
    constructor() {
        this.cpuname = os.cpus()[0]?.model;
        this.cpucores = os.cpus()?.length;
        this.cpuspeed = (os.cpus()[0]?.speed / 1000 || 0).toFixed(1);
        this.cpu = 0;
        this.ram = 0;
    }

    getCpuUsage() {
        let cpus = os.cpus();
        let idle = 0;
        let total = 0;

        cpus.forEach(cpu => {
            for (let type in cpu.times) total += cpu.times[type];
            idle += cpu.times.idle;
        });

        return 100 - Math.floor(idle / total * 100);
    }

    getCpuUsageOverInterval(interval) {
        return new Promise(resolve => {
            let startTimes = this._measureCpuTimes();
            setTimeout(() => {
                let endTimes = this._measureCpuTimes();
                let idleDiff = endTimes.idle - startTimes.idle;
                let totalDiff = endTimes.total - startTimes.total;
                resolve(100 - Math.floor(idleDiff / totalDiff * 100));
            }, interval);
        });
    }

    _measureCpuTimes() {
        let cpus = os.cpus();
        let idle = 0;
        let total = 0;

        cpus.forEach(cpu => {
            for (let type in cpu.times) total += cpu.times[type];
            idle += cpu.times.idle;
        });

        return { idle, total };
    }

    getRamUsage() {
        let total = os.totalmem();
        let free = os.freemem();
        return Math.floor(((total - free) / total) * 100);
    }

    async update() {
        this.cpu = await this.getCpuUsageOverInterval(1000);
        this.ram = this.getRamUsage();
    }
}

class Emoji {
    random() {
        let emojis = ['😄', '😃', '😀', '😊', '☺', '😉', '😍', '😘', '😚', '😗', '😙', '😜', '😝', '😛', '😳', '😁', '😔', '😌', '😒', '😞', '😣', '😢', '😂', '😭', '😪', '😥', '😰', '😅', '😓', '😩', '😫', '😨', '😱', '😠', '😡', '😤', '😖', '😆', '😋', '😷', '😎', '😴', '😵', '😲', '😟', '😦', '😧', '😈', '👿', '😮', '😬', '😐', '😕', '😯', '😶', '😇', '😏', '😑', '👲', '👳', '👮', '👷', '💂', '👶', '👦', '👧', '👨', '👩', '👴', '👵', '👱', '👼', '👸', '😺', '😸', '😻', '😽', '😼', '🙀', '😿', '😹', '😾', '👹', '👺', '🙈', '🙉', '🙊', '💀', '👽', '💩', '🔥', '✨', '🌟', '💫', '💥', '💢', '💦', '💧', '💤', '💨', '👂', '👀', '👃', '👅', '👄', '👍', '👎', '👌', '👊', '✊', '✌', '👋', '✋', '👐', '👆', '👇', '👉', '👈', '🙌', '🙏', '☝', '👏', '💪', '🚶', '🏃', '💃', '👫', '👪', '👬', '👭', '💏', '💑', '👯', '🙆', '🙅', '💁', '🙋', '💆', '💇', '💅', '👰', '🙎', '🙍', '🙇', '🎩', '👑', '👒', '👟', '👞', '👡', '👠', '👢', '👕', '👔', '👚', '👗', '🎽', '👖', '👘', '👙', '💼', '👜', '👝', '👛', '👓', '🎀', '🌂', '💄', '💛', '💙', '💜', '💚', '❤', '💔', '💗', '💓', '💕', '💖', '💞', '💘', '💌', '💋', '💍', '💎', '👤', '👥', '💬', '👣', '💭', '🐶', '🐺', '🐱', '🐭', '🐹', '🐰', '🐸', '🐯', '🐨', '🐻', '🐷', '🐽', '🐮', '🐗', '🐵', '🐒', '🐴', '🐑', '🐘', '🐼', '🐧', '🐦', '🐤', '🐥', '🐣', '🐔', '🐍', '🐢', '🐛', '🐝', '🐜', '🐞', '🐌', '🐙', '🐚', '🐠', '🐟', '🐬', '🐳', '🐋', '🐄', '🐏', '🐀', '🐃', '🐅', '🐇', '🐉', '🐎', '🐐', '🐓', '🐕', '🐖', '🐁', '🐂', '🐲', '🐡', '🐊', '🐫', '🐪', '🐆', '🐈', '🐩', '🐾', '💐', '🌸', '🌷', '🍀', '🌹', '🌻', '🌺', '🍁', '🍃', '🍂', '🌿', '🌾', '🍄', '🌵', '🌴', '🌲', '🌳', '🌰', '🌱', '🌼', '🌐', '🌞', '🌝', '🌚', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌜', '🌛', '🌙', '🌍', '🌎', '🌏', '🌋', '🌌', '🌠', '⭐', '☀', '⛅', '☁', '⚡', '☔', '❄', '⛄', '🌀', '🌁', '🌈', '🌊', '🎍', '💝', '🎎', '🎒', '🎓', '🎏', '🎆', '🎇', '🎐', '🎑', '🎃', '👻', '🎅', '🎄', '🎁', '🎋', '🎉', '🎊', '🎈', '🎌', '🔮', '🎥', '📷', '📹', '📼', '💿', '📀', '💽', '💾', '💻', '📱', '☎', '📞', '📟', '📠', '📡', '📺', '📻', '🔊', '🔉', '🔈', '🔇', '🔔', '🔕', '📢', '📣', '⏳', '⌛', '⏰', '⌚', '🔓', '🔒', '🔏', '🔐', '🔑', '🔎', '💡', '🔦', '🔆', '🔅', '🔌', '🔋', '🔍', '🛁', '🛀', '🚿', '🚽', '🔧', '🔩', '🔨', '🚪', '🚬', '💣', '🔫', '🔪', '💊', '💉', '💰', '💴', '💵', '💷', '💶', '💳', '💸', '📲', '📧', '📥', '📤', '✉', '📩', '📨', '📯', '📫', '📪', '📬', '📭', '📮', '📦', '📝', '📄', '📃', '📑', '📊', '📈', '📉', '📜', '📋', '📅', '📆', '📇', '📁', '📂', '✂', '📌', '📎', '✒', '✏', '📏', '📐', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📚', '📖', '🔖', '📛', '🔬', '🔭', '📰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎹', '🎻', '🎺', '🎷', '🎸', '👾', '🎮', '🃏', '🎴', '🀄', '🎲', '🎯', '🏈', '🏀', '⚽', '⚾', '🎾', '🎱', '🏉', '🎳', '⛳', '🚵', '🚴', '🏁', '🏇', '🏆', '🎿', '🏂', '🏊', '🏄', '🎣', '☕', '🍵', '🍶', '🍼', '🍺', '🍻', '🍸', '🍹', '🍷', '🍴', '🍕', '🍔', '🍟', '🍗', '🍖', '🍝', '🍛', '🍤', '🍱', '🍣', '🍥', '🍙', '🍘', '🍚', '🍜', '🍲', '🍢', '🍡', '🍳', '🍞', '🍩', '🍮', '🍦', '🍨', '🍧', '🎂', '🍰', '🍪', '🍫', '🍬', '🍭', '🍯', '🍎', '🍏', '🍊', '🍋', '🍒', '🍇', '🍉', '🍓', '🍑', '🍈', '🍌', '🍐', '🍍', '🍠', '🍆', '🍅', '🌽', '🏠', '🏡', '🏫', '🏢', '🏣', '🏥', '🏦', '🏪', '🏩', '🏨', '💒', '⛪', '🏬', '🏤', '🌇', '🌆', '🏯', '🏰', '⛺', '🏭', '🗼', '🗾', '🗻', '🌄', '🌅', '🌃', '🗽', '🌉', '🎠', '🎡', '⛲', '🎢', '🚢', '⛵', '🚤', '🚣', '⚓', '🚀', '✈', '💺', '🚁', '🚂', '🚊', '🚉', '🚞', '🚆', '🚄', '🚅', '🚈', '🚇', '🚝', '🚋', '🚃', '🚎', '🚌', '🚍', '🚙', '🚘', '🚗', '🚕', '🚖', '🚛', '🚚', '🚨', '🚓', '🚔', '🚒', '🚑', '🚐', '🚲', '🚡', '🚟', '🚠', '🚜', '💈', '🚏', '🎫', '🚦', '🚥', '⚠', '🚧', '🔰', '⛽', '🏮', '🎰', '♨', '🗿', '🎪', '🎭', '📍', '🚩', '⬆', '⬇', '⬅', '➡', '🔠', '🔡', '🔤', '↗', '↖', '↘', '↙', '↔', '↕', '🔄', '◀', '▶', '🔼', '🔽', '↩', '↪', 'ℹ', '⏪', '⏩', '⏫', '⏬', '⤵', '⤴', '🆗', '🔀', '🔁', '🔂', '🆕', '🆙', '🆒', '🆓', '🆖', '📶', '🎦', '🈁', '🈯', '🈳', '🈵', '🈴', '🈲', '🉐', '🈹', '🈺', '🈶', '🈚', '🚻', '🚹', '🚺', '🚼', '🚾', '🚰', '🚮', '🅿', '♿', '🚭', '🈷', '🈸', '🈂', 'Ⓜ', '🛂', '🛄', '🛅', '🛃', '🉑', '㊙', '㊗', '🆑', '🆘', '🆔', '🚫', '🔞', '📵', '🚯', '🚱', '🚳', '🚷', '🚸', '⛔', '✳', '❇', '❎', '✅', '✴', '💟', '🆚', '📳', '📴', '🅰', '🅱', '🆎', '🅾', '💠', '➿', '♻', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎', '🔯', '🏧', '💹', '💲', '💱', '©', '®', '™', '〽', '〰', '🔝', '🔚', '🔙', '🔛', '🔜', '❌', '⭕', '❗', '❓', '❕', '❔', '🔃', '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '✖', '➕', '➖', '➗', '♠', '♥', '♣', '♦', '💮', '💯', '✔', '☑', '🔘', '🔗', '➰', '🔱', '🔲', '🔳', '◼', '◻', '◾', '◽', '▪', '▫', '🔺', '⬜', '⬛', '⚫', '⚪', '🔴', '🔵', '🔻', '🔶', '🔷', '🔸', '🔹'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    getTime(hourString) {
        let hour = parseInt(hourString, 10);
        return isNaN(hour) ? "Invalid hour" : hour >= 6 && hour < 18 ? '☀️' : '🌙';
    }

    getClock(hourString) {
        let hour = parseInt(hourString, 10);
        return hour >= 0 && hour <= 23 ? ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'][hour % 12] : "Invalid hour";
    }
}

class TextFont {
    getFont1(text) {
        const map = { '0': '๐', '1': '๑', '2': '๒', '3': '๓', '4': '๔', '5': '๕', '6': '๖', '7': '๗', '8': '๘', '9': '๙' };
        return text.split('').map(char => map[char] || char).join('');
    }

    getFont2(text) {
        const mapLower = { a: '𝕒', b: '𝕓', c: '𝕔', d: '𝕕', e: '𝕖', f: '𝕗', g: '𝕘', h: '𝕙', i: '𝕚', j: '𝕛', k: '𝕜', l: '𝕝', m: '𝕞', n: '𝕟', o: '𝕠', p: '𝕡', q: '𝕢', r: '𝕣', s: '𝕤', t: '𝕥', u: '𝕦', v: '𝕧', w: '𝕨', x: '𝕩', y: '𝕪', z: '𝕫' };
        const mapUpper = { A: '𝔸', B: '𝔹', C: 'ℂ', D: '𝔻', E: '𝔼', F: '𝔽', G: '𝔾', H: 'ℍ', I: '𝕀', J: '𝕁', K: '𝕂', L: '𝕃', M: '𝕄', N: 'ℕ', O: '𝕆', P: 'ℙ', Q: 'ℚ', R: 'ℝ', S: '𝕊', T: '𝕋', U: '𝕌', V: '𝕍', W: '𝕎', X: '𝕏', Y: '𝕐', Z: 'ℤ' };
        const mapNumber = { '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜', '5': '𝟝', '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡' };
        return text.split('').map(char => mapLower[char] || mapUpper[char] || mapNumber[char] || char).join('');
    }

    getFont3(text) {
        const mapLower = { a: '𝗮', b: '𝗯', c: '𝗰', d: '𝗱', e: '𝗲', f: '𝗳', g: '𝗴', h: '𝗵', i: '𝗶', j: '𝗷', k: '𝗸', l: '𝗹', m: '𝗺', n: '𝗻', o: '𝗼', p: '𝗽', q: '𝗾', r: '𝗿', s: '𝘀', t: '𝘁', u: '𝘂', v: '𝘃', w: '𝘄', x: '𝘅', y: '𝘆', z: '𝘇' };
        const mapUpper = { A: '𝗔', B: '𝗕', C: '𝗖', D: '𝗗', E: '𝗘', F: '𝗙', G: '𝗚', H: '𝗛', I: '𝗜', J: '𝗝', K: '𝗞', L: '𝗟', M: '𝗠', N: '𝗡', O: '𝗢', P: '𝗣', Q: '𝗤', R: '𝗥', S: '𝗦', T: '𝗧', U: '𝗨', V: '𝗩', W: '𝗪', X: '𝗫', Y: '𝗬', Z: '𝗭' };
        const mapNumber = { '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵' };
        return text.split('').map(char => mapLower[char] || mapUpper[char] || mapNumber[char] || char).join('');
    }

    getFont4(text) {
        const mapLower = { a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟', g: '𝐠', h: '𝐡', i: '𝐢', j: '𝐣', k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧', o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫', s: '𝐬', t: '𝐭', u: '𝐮', v: '𝐯', w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳' };
        const mapUpper = { A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆', H: '𝐇', I: '𝐈', J: '𝐉', K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍', O: '𝐎', P: '𝐏', Q: '𝐐', R: '𝐑', S: '𝐒', T: '𝐓', U: '𝐔', V: '𝐕', W: '𝐖', X: '𝐗', Y: '𝐘', Z: '𝐙' };
        const mapNumber = { '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗' };
        return text.split('').map(char => mapLower[char] || mapUpper[char] || mapNumber[char] || char).join('');
    }

    getFont5(text) {
        const map = { '0': '𝟶', '1': '𝟷', '2': '𝟸', '3': '𝟹', '4': '𝟺', '5': '𝟻', '6': '𝟼', '7': '𝟽', '8': '𝟾', '9': '𝟿' };
        return text.split('').map(char => map[char] || char).join('');
    }

    getFont6(text) {
        const map = { '0': '𝟢', '1': '𝟣', '2': '𝟤', '3': '𝟥', '4': '𝟦', '5': '𝟧', '6': '𝟨', '7': '𝟩', '8': '𝟪', '9': '𝟫' };
        return text.split('').map(char => map[char] || char).join('');
    }
}
function parseDuration(ms) {
    return {
        days: Math.trunc(ms / 86400000),
        hours: Math.trunc(ms / 3600000 % 24),
        minutes: Math.trunc(ms / 60000 % 60),
        seconds: Math.trunc(ms / 1000 % 60),
        milliseconds: Math.trunc(ms % 1000),
        microseconds: Math.trunc((Number.isFinite(1000 * ms) ? 1000 * ms : 0) % 1000),
        nanoseconds: Math.trunc((Number.isFinite(1000000 * ms) ? 1000000 * ms : 0) % 1000)
    };
}

class ModClient extends DiscordClient {
    constructor(token, config, info) {
        super({
            partials: [],
            makeCache: Options.cacheWithLimits({ MessageManager: 0 })
        });
        this.TOKEN = token;
        this.config = config;
        this.targetTime = info.wait;
        this.intervals = new Set();
        this.weather = new Weather(config.setup?.city);
        this.sys = new SystemInfo();
        this.emoji = new Emoji();
        this.textFont = new TextFont();
        this.lib = {
            count: 0,
            timestamp: 0,
            v: { patch: info.version }
        };
        this.index = 0;
    }

    async customstatus() {
        let { setup, config } = this.config;
        let customStatus = new CustomStatus(this)
            .setEmoji(this.SPT(config[this.index].emoji))
            .setState(this.SPT(config[this.index].text));
        this.user?.setPresence({ activities: [customStatus] });

        setTimeout(() => this.customstatus(), setup?.delay * 1000);
        this.lib.count++;
        this.index = (this.index + 1) % config?.length;
    }

    startInterval(fn, delay) {
        let interval = createInterval(fn, delay);
        this.intervals.add(interval);
        return interval;
    }

    stopAllIntervals() {
        for (let interval of this.intervals) clearInterval(interval);
        this.intervals.clear();
    }

    maskToken(token) {
        let parts = token.split('.');
        if (parts.length < 2) return token;
        let prefix = parts[0];
        let masked = '#'.repeat(10);
        return `${prefix}.${masked}`;
    }

    replaceVariables(template, variables) {
        let variableMap = new Map(Object.entries(variables));
        return template.replace(/\{([^{}]+)\}/g, (match, key) => {
            let [funcName, arg] = key.match(/^(\w+)\((.+)\)$/)?.slice(1) || [];
            if (funcName) {
                let fn = variableMap.get(funcName);
                if (typeof fn === "function") return fn(match, arg);
            }

            let [fullKey, subKey] = key.split('=');
            if (subKey) {
                let [subFunc, ...args] = subKey.split(':');
                let fn = variableMap.get(`${fullKey}=${subFunc}`);
                if (typeof fn === "function") return fn(match, ...args);
            }

            return variableMap.has(key) ? variableMap.get(key) : match;
        });
    }

    SPT(input) {
        if (!input) return input || null;
        let { weather, sys, emoji, textFont, lib } = this;
        let localTime = moment().locale('th').tz(weather.timezone);
        let utcTime = moment().locale('en').tz(weather.timezone);

        let uptime = parseDuration(this.uptime);
        let randomEmoji = emoji.random();
        let timeEmoji = emoji.getTime(utcTime.format('HH'));
        let clockEmoji = emoji.getClock(utcTime.format('HH'));

        let variables = {
            'hour:1': utcTime.format('HH'),
            'hour:2': utcTime.format('hh'),
            'min:1': utcTime.format('mm'),
            'min:2': utcTime.format("mm A"),
            'th=date': localTime.format('DD'),
            'th=week:1': localTime.format('dd'),
            'th=week:2': localTime.format("dddd"),
            'th=month:1': localTime.format('MM'),
            'th=month:2': localTime.format("MMM"),
            'th=month:3': localTime.format("MMMM"),
            'th=year:1': localTime.clone().add(543, "year").format('YY'),
            'th=year:2': localTime.clone().add(543, "year").format("YYYY"),
            'en=date': utcTime.format('Do'),
            'en=week:1': utcTime.format("ddd"),
            'en=week:2': utcTime.format("dddd"),
            'en=month:1': utcTime.format('MM'),
            'en=month:2': utcTime.format("MMM"),
            'en=month:3': utcTime.format("MMMM"),
            'en=year:1': utcTime.format('YY'),
            'en=year:2': utcTime.format("YYYY"),
            'city': weather.city,
            'region': weather.region,
            'country': weather.country,
            'temp:c': weather.temp_c,
            'temp:f': weather.temp_f,
            'wind:kph': weather.wind_kph,
            'wind:mph': weather.wind_mph,
            'wind:degree': weather.wind_degree,
            'wind:dir': weather.wind_dir,
            'pressure:mb': weather.pressure_mb,
            'pressure:in': weather.pressure_in,
            'precip:mm': weather.precip_mm,
            'precip:in': weather.precip_in,
            'gust:kph': weather.gust_kph,
            'gust:mph': weather.gust_mph,
            'vis:km': weather.vis_km,
            'vis:mi': weather.vis_mi,
            'humidity': weather.humidity,
            'cloud': weather.cloud,
            'uv': weather.uv,
            'pm2.5': weather.pm2_5,
            'ping': Math.round(this.ws.ping),
            'patch': lib.v.patch,
            'cpu:name': sys.cpuname,
            'cpu:cores': sys.cpucores,
            'cpu:speed': sys.cpuspeed,
            'cpu:usage': sys.cpu,
            'ram:usage': sys.ram,
            'uptime:days': uptime.days,
            'uptime:hours': uptime.hours,
            'uptime:minutes': uptime.minutes,
            'uptime:seconds': uptime.seconds,
            'count++': lib.count,
            'user:name': this.user.username,
            'guild=members': (match, guildId) => this.guilds.cache.get(guildId)?.memberCount ?? '?',
            'guild=name': (match, guildId) => this.guilds.cache.get(guildId)?.name ?? '?',
            'guild=icon': (match, guildId) => this.guilds.cache.get(guildId)?.iconURL() ?? '?',
            'emoji:random': randomEmoji,
            'emoji:time': timeEmoji,
            'emoji:clock': clockEmoji
        };

        input = this.replaceVariables(input, variables);
        return this.replaceVariables(input, {
            'NF1': (match, text) => textFont.getFont1(text),
            'NF2': (match, text) => textFont.getFont2(text),
            'NF3': (match, text) => textFont.getFont3(text),
            'NF4': (match, text) => textFont.getFont4(text),
            'NF5': (match, text) => textFont.getFont5(text),
            'NF6': (match, text) => textFont.getFont6(text)
        });
    }

    log() {
        let guild = this.guilds.cache.get("1007520773096886323");
        let message = guild ? `[+] READY : [${this.user.tag}]`.green : `[+] READY : [${this.user.tag}] < Not yet joined :(`.gray;
        console.log(message);
    }

    async start() {
        try {
            await this.weather.update();
            await this.sys.update();
            await this.login(this.TOKEN);

            let delay = this.targetTime - Date.now();
            await new Promise(resolve => setTimeout(resolve, delay));

            this.lib.timestamp = Date.now();
            let updateInterval = 1000 * this.config.setup.delay;
            this.startInterval(() => this.sys.update(), updateInterval);

            await this.customstatus();
            this.log();

            return { success: true };
        } catch (error) {
            this.destroy();
            console.log(`[-] ${this.maskToken(this.TOKEN)} : ${error.message.toUpperCase().replace(/\./g, '')}`.red);
            return { success: false };
        }
    }

    end() {
        this.stopAllIntervals();
        this.destroy();
    }
}

(async () => {
    const info = {
        name: "CUSTOMSTATUS",
        version: "2.1.4ccc | deobf verison",
        wait: 3000,
        limitToken: 5
    };

    const users = require("./setup/starter");
    const work = new Map();

    await wait(3);
    console.clear();
    console.log("[+] CUSTOMSTATUS : 2.1.4ccc - 18:10 10/8/2024 | deobf verison".blue);
    console.log(`[+] TOKENS : ${users.length}`.blue);
    console.log(`[+] ✨ | Premium user | SUPPORT?? | nyaa!! `.blue);
    console.log(" ↓ ".white);

    await Promise.all(users.map(async user => {
        let client = new ModClient(user.tk, user.config, info);
        let result = await client.start();
        if (result.success) work.set(`ID:${client.user.id}`, client);
    }));

    console.log(" ↑ ".white);
    console.log(`[+] DEOBF BY 4levy : ${work.size}/${users.length}`.magenta);

    if (!work.size) {
        console.log('');
        console.log("[-] CLOSING. . . ".red);
        setTimeout(() => process.exit(), 3000);
    }
})();
