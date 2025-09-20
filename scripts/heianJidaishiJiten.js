class GlobalManager {
	constructor() {
		// 五十音順検索／ページ番号入力／先頭の漢字入力関連の要素タグと選択時の処理
		this.kanaForm = document.getElementById("KanaForm");
		this.textEntry = document.getElementById("TextEntry");
		this.textEntry.addEventListener("focus", () => {this.textEntry.select();});
		this.pageForm = document.getElementById("PageForm");
		this.pageEntry = document.getElementById("PageEntry");
		this.pageEntry.addEventListener("focus", () => {this.pageEntry.select();});
		this.kanjiForm = document.getElementById("KanjiForm");
		this.kanjiEntry = document.getElementById("KanjiEntry");
		this.kanjiEntry.addEventListener("focus", () => {this.kanjiEntry.select();});

		// Escape キー押下時にフォーカスがあるフィールドを消去する。
		document.addEventListener("keydown", (evt) => {
			if (evt.key == "Escape") {
				if (isElementFocused(this.textEntry)) {
					eraseTextEntry();
				} else if (isElementFocused(this.pageEntry)) {
					erasePageEntry();
				} else if (isElementFocused(this.kanjiEntry)) {
					eraseKanjiEntry();
				}
			}
		});

		// 五十音順検索フィールドでEnterキーが押下された際、検索処理を実行する。
		this.kanaForm.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" && !evt.isComposing) {
				evt.preventDefault();
				phoneticSearch();
				this.textEntry.focus();
			}
		});

		// ページ番号入力フィールドでEnterキーが押下された際、該当ページを表示する。
		this.pageForm.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" && !evt.isComposing) {
				evt.preventDefault();
				directOpen();
				this.pageEntry.focus();
			}
		});

		// 先頭の漢字フィールドでEnterキーが押下された際、漢字検索処理を実行する。
		this.kanjiForm.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" && !evt.isComposing) {
				evt.preventDefault();
				kanjiSearch();
				this.kanjiEntry.focus();
			}
		});

		// 各種情報ドロップダウンボックスが選択された際、適切な処理を実行する。
		this.dossiers = document.getElementById("Dossiers");
		this.dossiers.addEventListener("change", (evt) => {
			dossierSelected();
		});

		// 汎用出力領域
		this.displayArea = document.getElementById("DisplayArea");

		// 四角号碼ダイアログボックス関連
		this.dialogBox = document.getElementById("DialogBox");
		this.dialogCloseButton = document.getElementById("DialogCloseButton");
		this.dialogCloseButton.addEventListener("click", (evt) => {
			closeDialogBox();
		});
		this.dialogBox.addEventListener("close", () => {
			this.kanjiEntry.focus();
		});
		this.resultArea = document.getElementById("ResultArea");
		this.fcEntry = document.getElementById("FCEntry");

		// 四角号碼が入力された際の逐次処理
		this.fcEntry.addEventListener("input", () => {
			let target = this.fcEntry.value;
			this.resultArea.innerHTML = "";
			target = target.replaceAll(/\s/g, "");
			if (target.match(/[^\d\/.]/))  return;
			if (target.match(/^\s*$/)) {
				return;
			}
			const pvalue = preProcess(target);
			const regexp = new RegExp("^" + pvalue);
			this.cycle = 0;
			fcSearch(regexp);
		});

		// 起動パラメータの取得
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get("local") === "yes") {
			this.local = true;
			document.getElementById("FooterMessage").innerHTML = "Powered by data from NDL Digital Collection."
			if (urlParams.get("ocr") === "yes") {
				this.ocr = true;
			} else {
				this.ocr = false;
			}
		} else {
			this.local = false;
		}

		// 各種の定数
		this.REMOTEIDX = 0;
		this.LOCALIDX = 1;
		this.OFFSET = 2;
		this.FRAMEMAX = 3;
		this.MAXITEMS = 50;
	}
}
/****************************************
 * トップレベル
 *****************************************/
const G = new GlobalManager();
const R = new RegulatorNeo();
displayManual();
G.textEntry.focus();

/****************************************
 * 五十音順検索処理
 *****************************************/
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

// 五十音順検索欄の内容を消去する。
function eraseTextEntry() {
	G.textEntry.value = "";
	displayManual();
	G.textEntry.focus();
}

/****************************************
 * ページ番号直接入力による本文表示処理
 *****************************************/
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
	const volFrame = getFrameNoForContents(nombre);		// Defined in volInfo.js
	windowOpen(G.local, volFrame[0], volFrame[1]);
}

// ページ入力欄の内容を消去する。
function erasePageEntry() {
	G.pageEntry.value = "";
	displayManual();
	G.pageEntry.focus();
}

/****************************************
 * 先頭の漢字検索に関する処理
 *****************************************/
function kanjiSearch() {
	G.displayArea.innerHTML = "";
	// tableフレーム作成
	const table = document.createElement("table");
	table.id = "Sakuin";
	// 見出し作成
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

	// テーブル内容の作成
	let target = G.kanjiEntry.value;
	if (target == "") return;
	if (target.match(/^\d+$/)) {		// 画数が入力された際の処理
		const startPage = findPage(Number(target));
		const endPage = findPage(Number(target)+1)
		for(let i = startPage; i <= endPage; i++) {
			let text = strokeCountIndex[i].replaceAll(/(\d+)/g, "<span style='color: red'>［$&画］</span>");
			const frameNo = getFrameNoForIndex(i);		// Defined in volInfo.js
			const row = table.insertRow(-1);
			const direction = ((i % 2) == 1) ? "R" : "L";
			let anchor;
			if (G.local) {
				if (G.ocr) {
					anchor = "<a href='javascript:ocrWindowOpen(" + frameNo + ");'>" + i + "</a> " + direction;
				} else {
					anchor = "<a href='./assets/" + volInfo[3][1] + "#page=" + frameNo + "' target='_blank'>" + i + "</a> " + direction;
				}
			} else {
				anchor = "<a href='" + volInfo[3][0] + frameNo + "' target='_blank'>" + i + "</a> " + direction;
			}
			row.insertCell(0).innerHTML = anchor;
			row.insertCell(1).innerHTML = text;
		}
	} else {		// 漢字が入力された際の処理
		target = target.substr(0, 1);
		G.kanjiEntry.value = target;
		for(let i = 0; i < strokeCountIndex.length; i++) {
			if (strokeCountIndex[i].includes(target)) {
				let text = strokeCountIndex[i].replaceAll(target, "<span style='color: green'>" + target + "</span>");
				text = text.replaceAll(/(\d+)/g, "<span style='color: red'>［$&画］</span>");
				const frameNo = getFrameNoForIndex(i);		// Defined in volInfo.js
				const row = table.insertRow(-1);
				const direction = ((i % 2) == 1) ? "R" : "L";
				let anchor;
				if (G.local) {
					if (G.ocr) {
						anchor = "<a href='javascript:ocrWindowOpen(" + frameNo + ");'>" + i + "</a> " + direction;
					} else {
						anchor = "<a href='./assets/" + G.volInfo[3][1] + "#page=" + frameNo + "' target='_blank'>" + i + "</a> " + direction;
					}
				} else {
					anchor = "<a href='" + volInfo[3][0] + frameNo + "' target='_blank'>" + i + "</a> " + direction;
				}
				row.insertCell(0).innerHTML = anchor;
				row.insertCell(1).innerHTML = text;
			}
		}
	}
}

// 画数検索時の補助関数（画数からstrokeCountIndex配列の該当インデックス（索引の論理ページ）を返す）
function findPage(numOfStrokes) {
	let i = 0;
	while (i < strokeCountIndex.length) {
		if (strokeCountIndex[i].match("[^\d]" + numOfStrokes + "[^\d]")) {
			break;
		}
		i++;
	}
	return i;
}

// 先頭の漢字入力欄の内容を消去する。
function eraseKanjiEntry() {
	G.kanjiEntry.value = "";
	displayManual();
	G.kanjiEntry.focus();
}

/****************************************
 * 四角号碼関連
 *****************************************/

// 四角号碼ダイアログボックスをオープンする。
function openDialogBox() {
	G.fcEntry.value = "";
	G.resultArea.innerHTML = "";
	G.dialogBox.showModal();
	G.fcEntry.focus();
}
// 四角号碼ダイアログボックスをクローズする。
function closeDialogBox() {
	G.dialogBox.close();
	G.kanjiEntry.focus();
}

// 四角号碼検索の前段階として、正規表現を作成する（「/」はor、「.」はワイルドカード）
function preProcess(content) {
	content = content.replaceAll(/\s/g, "");
	let novoContent = "";
	let newContent = "";
	do {
		novoContent = content.replace(/(\d)\/(\d)/, "[$1$2]");
		if (novoContent == content) {
			return content;		// EXIT POINT
		}
		content = novoContent;
		newContent = "";
		do {
			newContent = content.replace(/\]\/(\d)/, "$1]");
			if (newContent == content) {
				break;
			}
			content = newContent;
		} while (true);
	} while (true);
}

// 指定した正規表現式に合致する四角号碼を検索する。
function fcSearch(regexp) {
	G.resultArea.innerHTML = "";
	const table = document.createElement("table");
	G.resultArea.appendChild(table);
	const colMax = 4;
	let colSize = colMax + 1;
	let row;
	let matchCount = 0;
	const startPoint = G.MAXITEMS * G.cycle;
	const endPoint = G.MAXITEMS * (G.cycle + 1);
	if (G.cycle > 0) {
		row = table.insertRow(-1);
		const cell = row.insertCell(0);
		cell.innerHTML = "　<< 前";
		cell.style = "color: green;";
		cell.addEventListener("click", (evt) => {
			G.cycle--;
			fcSearch(regexp);
			return;
		});
	}
	for (let entry of fourCornerMini) {
		if (entry[1].match(regexp)) {
			matchCount++;
			if (matchCount <= startPoint) continue;
			if (colSize > colMax) {
				row = table.insertRow(-1);
				colSize = 0;
			}
			const cell = row.insertCell(colSize);
			colSize++;
			cell.innerHTML = entry[0] + " (" + regulate(entry[1]) + ")";
			cell.addEventListener("click", (evt) => {
				G.kanjiEntry.value = entry[0];
				closeDialogBox();
			});
			if (matchCount >= endPoint) {
				row = table.insertRow(-1);
				const cell = row.insertCell(0);
				cell.innerHTML = "　次 >>";
				cell.style = "color: green;";
				cell.addEventListener("click", (evt) => {
					G.cycle++;
					fcSearch(regexp);
					return;
				});
				return;
			}
		}
	}
}

// 四角号碼の附角をsubscript化する。
function regulate(str) {
	return str.slice(0, 4) + "<span class='subscript'>" + str.slice(4) + "</span>";
}

/****************************************
 * ウィンドウオープン処理
 *****************************************/

// 書籍のオープン処理（NDLサイト／ブラウザ搭載PDF／SimpleViewerに関する判定処理を含む）
// idxは本文ページノンブルに相当
function windowOpen(local, targetVol, idx) {
	if (local) {
		if (G.ocr) {
			window.open("./simpleViewer.html?path=" + "./assets/" + volInfo[targetVol][G.LOCALIDX] + "&page=" + (volInfo[targetVol][G.OFFSET] + idx), "Result");
		} else {
			window.open("./assets/" + volInfo[targetVol][G.LOCALIDX] + "#page=" + (volInfo[targetVol][G.OFFSET] + idx), "Result");
		}
	} else {
		window.open(volInfo[targetVol][G.REMOTEIDX] + (volInfo[targetVol][G.OFFSET] + idx), "Result");
	}
	G.textEntry.focus();
}

// 索引のオープン処理（この関数はlocal=yes&ocr=yesの場合にのみ呼び出される）
function ocrWindowOpen(frame) {
	window.open("./simpleViewerOCR.html?path=" + "./assets/" + volInfo[3][G.LOCALIDX] + "&pageReverse=1&page=" + frame, "Result");
}

/****************************************
 * 各種の細々した処理
 *****************************************/

// 指定した要素にフォーカスがあるかどうかを判定する処理
function isElementFocused(elem) {
	return document.activeElement === elem && document.hasFocus();
}

/****************************************
 * 各種情報および使用方法
 *****************************************/

// 各種資料が選択された際の処理
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

// 総説が選択された際、汎用出力領域に表示される内容
function generalDescription() {
	let pad = "<h3>総説</h3>";
	pad += "<ul>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 1, -10)'>平安時代概観</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 1, -7)'>平安京</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 1, -4)'>平安宮</a></li>";
	pad += "</ul>";
	G.displayArea.innerHTML = pad;
}

// 絵画資料が選択された際、汎用出力領域に表示される内容
function imageSection() {
	let pad = "<h3>絵画資料</h3>";
	pad += "<ul>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 7)'>類聚雑要抄</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 18)'>輿車図考附図</a></li>";
	pad += "<li><a href='javascript:windowOpen(" + G.local + ", 3, 24)'>院宮及私第図</a></li>";
	pad += "</ul>";
	G.displayArea.innerHTML = pad;
}

// 平安図録が選択された際、汎用出力領域に表示される内容
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
	pad += "<br>";
	pad += "<br>";
	pad += "<br>";
	G.displayArea.innerHTML = pad;
}

// 平安要覧が選択された際、汎用出力領域に表示される内容
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

// 使用方法を表示する。
function displayManual() {
	let message = "<h3>使用方法</h3>";
	message += "<ul>";
	message += "<li>読み方が分かっている語";
	message += "<ul>";
	message += "<li>［50音順検索］欄にひらがなで検索語を入力すると、本文の該当ページが別タブで開きます。</li>";
	message += "</ul></li>"
	message += "<li>読み方が分からない語";
	message += "<ol>";
	message += "<li>［先頭の漢字］欄に漢字を1文字（複数入力した場合は先頭の漢字が使用されます）入力すると、指定した先頭の1文字が記載されている索引巻の該当ページに関する情報が一覧表示されます。<br>※ 別法として画数を半角数字で入力することもできます。</li>";
	message += "<li>その中の［索引頁］列の数字をクリックすると、索引巻の該当ページが別タブで開きます。</li>";
	message += "<li>検索したい語が定義されているページ番号を見つけ出し、［本文ページ］欄にその数値を入力すると、本文の該当ページが別タブで開きます。</li>";
	message += "</ol></li>"
	message += "<li>その他の読み物";
	message += "<ul>";
	message += "<li>［各種情報］のドロップダウンボックスから指定します。</li>";
	message += "</ul></li>"
	message += "</ul>";
	G.displayArea.innerHTML = message;
}

