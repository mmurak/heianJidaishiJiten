const volInfo = [
			[],
			["https://dl.ndl.go.jp/pid/13207693/1/", "平安時代史事典-上巻.pdf", 23, 1435],
			["https://dl.ndl.go.jp/pid/13324164/1/", "平安時代史事典-下巻.pdf", 4, 2774],
			["https://dl.ndl.go.jp/pid/13207592/1/", "平安時代史事典-索引巻.pdf", 0],
];

// 戻り値はvolInfo[][2]を考慮していないフレーム数である点に注意（このオフセットはwindowOpenで対処）
function getFrameNoForContents(logicalPageForIndex) {
	let volNo;
	let frameNo;
	if (logicalPageForIndex <= volInfo[1][3]) {	// Last page number for Vol.1
		volNo = 1;
		frameNo = Math.floor(logicalPageForIndex / 2);
		if (logicalPageForIndex > 377)  frameNo--;		// 落丁補正
		if (logicalPageForIndex > 877)  frameNo--;		// 落丁補正
		if (logicalPageForIndex > 949)  frameNo--;		// 落丁補正
	} else {
		volNo = 2;
		frameNo = Math.floor((logicalPageForIndex - (volInfo[1][3] + 1)) / 2);
	}
	return [volNo, frameNo];
}

function getFrameNoForIndex(logicalPageForIndex) {
	return 203 - Math.floor(logicalPageForIndex / 2);
}