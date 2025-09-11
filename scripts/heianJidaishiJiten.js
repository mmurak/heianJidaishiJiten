class GlobalManager {
	constructor() {
		this.textEntry = document.getElementById("TextEntry");
		this.textEntry.addEventListener("focus", () => {this.textEntry.select();});
		this.pageEntry = document.getElementById("PageEntry");
		this.pageEntry.addEventListener("focus", () => {this.pageEntry.select();});
		this.kanjiEntry = document.getElementById("KanjiEntry");
		this.kanjiEntry.addEventListener("focus", () => {this.kanjiEntry.select();});
		document.addEventListener("keyup", (evt) => {
			if (evt.key == "Enter") {
				if (isElementFocused(this.textEntry)) {
					phoneticSearch();
					this.textEntry.focus();
				} else if (isElementFocused(this.pageEntry)) {
					directOpen();
					this.pageEntry.focus();
				} else if (isElementFocused(this.kanjiEntry)) {
					kanjiSearch();
					this.kanjiEntry.focus();
				}
			} else if (evt.key == "Escape") {
				if (isElementFocused(this.textEntry)) {
					eraseTextEntry();
				} else if (isElementFocused(this.pageEntry)) {
					erasePageEntry();
				} else if (isElementFocused(this.kanjiEntry)) {
					eraseKanjiEntry();
				}
			}
		});
		this.dossiers = document.getElementById("Dossiers");
		this.dossiers.addEventListener("change", (evt) => {
			dossierSelected();
		});
		this.displayArea = document.getElementById("DisplayArea");
		//
		this.volInfo = [
			[],
			["https://dl.ndl.go.jp/pid/13207693/1/", "平安時代史事典-上巻.pdf", 23, 741],
			["https://dl.ndl.go.jp/pid/13324164/1/", "平安時代史事典-下巻.pdf", 4, 206],
			["https://dl.ndl.go.jp/pid/13207592/1/", "平安時代史事典-索引巻.pdf", 0],
		];
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('local') === 'yes') {
			this.local = true;
		} else {
			this.local = false;
		}
		this.REMOTEIDX = 0;
		this.LOCALIDX = 1;
		this.OFFSET = 2;
		this.FRAMEMAX = 3;
	}
}
const G = new GlobalManager();
const R = new RegulatorNeo();
G.textEntry.focus();

function phoneticSearch() {
	let target = G.textEntry.value;
	target = target.replace(/[ァ-ン]/g, (s) => {
		return String.fromCharCode(s.charCodeAt(0) - 0x60);
	});
	const targetVol = (R.compare(target, volTwo[0]) < 0) ? 1 : 2;
	const targetDB = (targetVol == 1) ? volOne : volTwo;
	let idx = targetDB.length - 1;
	while (R.compare(target, targetDB[idx]) < 0) {
		idx--;
	}
	windowOpen(G.local, targetVol, idx);
}

function directOpen() {
	const value = G.pageEntry.value;
	if (value == "")  return;
	const m = value.match(/^(\d+)$/);
	if (!m) {
		alert("半角数字で入力してください。");
		G.pageEntry.value = "";
		return;
	}
	const nombre = Number(value);
	let frameNo;
	let targetVol;
	if (nombre <= 1435) {		// 欠落ページ　376,377（210コマの次）  876,877（459コマの次）  948,949（494コマの次）
		frameNo = Math.floor(nombre / 2);
		if (value > 377)  frameNo--;		// 落丁補正
		if (value > 877)  frameNo--;		// 落丁補正
		if (value > 949)  frameNo--;		// 落丁補正
		targetVol = 1;
	} else {
		frameNo = Math.floor(nombre / 2) - 718;
		targetVol = 2;
	}
	windowOpen(G.local, targetVol, frameNo);
}

function kanjiSearch() {
	G.displayArea.innerHTML = "";
	const table = document.createElement("table");
	const thead = document.createElement("thead");
	const headerRec = document.createElement("tr");
	const th1 = document.createElement("th");
	th1.textContent = "索引頁";
	headerRec.appendChild(th1);
	const th2 = document.createElement("th");
	th2.textContent = "頁内の先頭文字";
	headerRec.appendChild(th2);
	thead.appendChild(headerRec);
	table.appendChild(thead);
	G.displayArea.appendChild(table);

	let target = G.kanjiEntry.value;
	if (target == "") return;
	if (target.match(/^\d+$/)) {
		const startPage = findPage(Number(target));
		const endPage = findPage(Number(target)+1)
		for(let i = startPage; i <= endPage; i++) {
			let text = strokeCountIndex[i].replaceAll(/(\d+)/g, "<span style='color: red'>［$&画］</span>");
			const frameNo = 203 - Math.floor(i / 2);
			const row = table.insertRow(-1);
			const anchor = (G.local) ? "<a href='./assets/" + G.volInfo[3][1] + "#page=" + frameNo + "' target='_blank'>" + i + "</a>" 
												: "<a href='" + G.volInfo[3][0] + frameNo + "' target='_blank'>" + i + "</a>" ;
			row.insertCell(0).innerHTML = anchor;
			row.insertCell(1).innerHTML = text;
		}
	} else {
		target = target.substr(0, 1);
		G.kanjiEntry.value = target;
		for(let i = 0; i < strokeCountIndex.length; i++) {
			if (strokeCountIndex[i].includes(target)) {
				let text = strokeCountIndex[i].replaceAll(target, "<span style='color: green'>" + target + "</span>");
				text = text.replaceAll(/(\d+)/g, "<span style='color: red'>［$&画］</span>");
				const frameNo = 203 - Math.floor(i / 2);
				const row = table.insertRow(-1);
				const anchor = (G.local) ? "<a href='./assets/" + G.volInfo[3][1] + "#page=" + frameNo + "' target='_blank'>" + i + "</a>" 
													: "<a href='" + G.volInfo[3][0] + frameNo + "' target='_blank'>" + i + "</a>" ;
				row.insertCell(0).innerHTML = anchor;
				row.insertCell(1).innerHTML = text;
			}
		}
	}
}

function findPage(target) {
	let i = 0;
	while (i < strokeCountIndex.length) {
		if (strokeCountIndex[i].match("[^\d]" + target + "[^\d]")) {
			break;
		}
		i++;
	}
	return i;
}

function dossierSelected() {
	const idx = G.dossiers.selectedIndex;
	switch (idx) {
		case 1:
			windowOpen(G.local, 1, -19);
			break;
		case 2:
			windowOpen(G.local, 1, -18);
			break;
		case 3:
			windowOpen(G.local, 1, -16);
			break;
		case 4:
			windowOpen(G.local, 1, -15);
			break;
		case 5:
			windowOpen(G.local, 1, -14);
			break;
		case 6:
			windowOpen(G.local, 1, -13);
			break;
		case 7:
			windowOpen(G.local, 1, -11);
			break;
		case 8:
			generalDescription();
			break;
		case 9:
			imageSection();
			break;
		case 10:
			figureSection();
			break;
		case 11:
			summarySection();
			break;
		default:
	}
	G.dossiers.selectedIndex = 0;
}

function generalDescription() {
	let pad = "<h3>総説</h3>";
	pad += "<ul>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 1, -10)'>平安時代概観</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 1, -7)'>平安京</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 1, -4)'>平安宮</a></li>";
	pad += "</ul>";
	G.displayArea.innerHTML = pad;
}

function imageSection() {
	let pad = "<h3>絵画資料</h3>";
	pad += "<ul>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 7)'>類聚雑要抄</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 18)'>輿車図考附図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 24)'>院宮及私第図</a></li>";
	pad += "</ul>";
	G.displayArea.innerHTML = pad;
}

function figureSection() {
	let pad = "<h3>平安図録</h3>";
	pad += "<ul>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 41)'>長岡京条坊図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 41)'>長岡宮朝堂院復原図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 42)'>平安京条坊図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 42)'>平安京大内裏図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 43)'>平安宮内裏図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 43)'>平安宮朝堂院・豊楽院図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 44)'>平安京周辺図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 44)'>畿内周辺図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 45)'>畿内と周辺の交通路</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 45)'>平安時代の交通路</a></li>";
	pad += "<li>建築図";
	pad += "<ul>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 47)'>神社本殿の主要形式と部分名称</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 48)'>鳥居の形式と部分名称</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 48)'>屋根の形式と部分名称</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 49)'>斗栱の主要形式</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 49)'>塔の部分名称</a></li>";
	pad += "</ul>";
	pad += "</li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 49)'>仏像図</a></li>";
	pad += "<li>服飾図";
	pad += "<ul>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 50)'>男性装束</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 51)'>女性装束</a></li>";
	pad += "</ul>";
	pad += "</li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 51)'>武具図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 52)'>馬具図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 53)'>時刻図・方位図</a></li>";
	pad += "</ul>";
	G.displayArea.innerHTML = pad;
}

function summarySection() {
	let pad = "<h3>平安要覧</h3>";
	pad += "<ul>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 54)'>天皇表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 55)'>付・皇室系図</a></li>";
	pad += "<li>日本古代後宮表";
	pad += "<ul>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 57)'>伊勢斎宮表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 60)'>賀茂斎院表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 61)'>女院表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 63)'>歴代皇妃表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 75)'>主要官女表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 100)'>日本古代後宮表索引</a></li>";
	pad += "</ul>";
	pad += "</li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 105)'>官位相当表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 108)'>官位唐名表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 109)'>摂政・関白補任表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 110)'>文化財一覧表</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 131)'>平安時代関係国指定史跡一覧表</a></li>";
	pad += "</ul>";
	G.displayArea.innerHTML = pad;
}

function eraseTextEntry() {
	G.textEntry.value = "";
	G.textEntry.focus();
}

function erasePageEntry() {
	G.pageEntry.value = "";
	G.pageEntry.focus();
}

function eraseKanjiEntry() {
	G.kanjiEntry.value = "";
	G.displayArea.innerHTML = "";
	G.kanjiEntry.focus();
}

function windowOpen(local, targetVol, idx) {
	if (local) {
		window.open("./assets/" + G.volInfo[targetVol][G.LOCALIDX] + "#page=" + (G.volInfo[targetVol][G.OFFSET] + idx), "Result");
	} else {
		window.open(G.volInfo[targetVol][G.REMOTEIDX] + (G.volInfo[targetVol][G.OFFSET] + idx), "Result");
	}
	G.textEntry.focus();
}

function isElementFocused(elem) {
	return document.activeElement === elem && document.hasFocus();
}
