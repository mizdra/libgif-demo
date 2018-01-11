/*
 * 非常に適当に作っています。
 * 読みやすさなどは考えていないので、正式版が出るまで待ってください。
 * また、このコードはデバッカ用なので、このコードの目的とは関係のないコードも含まれています。
 * 
 * ver : 1.0beta
 * Copyright (c) 2012 mizdra(http://mizdora.blog.fc2.com/) All rights reserved.
 * コードの改変、及び再配布は禁止します。
 **/
function libgif(url) {
    var binary = new BinFileReader(url);//バイナリデータ
    //1st: 27ms
    var startTime = new Date().getTime();
    var header = pt1(6),
    lsd = pt1(7),
    gct = lsd[4]>>7 ? pt1(3*(2<<(lsd[4]&7))) : undefined,
    ae, gce = [], id = [], lct = [], tbid = [], ce =[], pte = [], trailer, j, l = 0;
    
    
    while((j=binary.readNumber(1)) != 0x3b){
        if(j == 0x2c){
            
            binary.movePointer(-1);
            id[l] = pt1(10);
            lct[l] = id[l][9]>>7 ? pt1(3*(2<<(id[l][9]&7))) : undefined;
            tbid[l] = pt2([binary.readNumber(1)]);
            l++;
            
        }else{
            switch(binary.readNumber(1)){
                case 0xf9:
                    gce[l] = pt2([0x21, 0xf9]);
                    break;
                    
                case 0xfe:
                    ce[l] = pt2([0x21, 0xfe]);
                    break;
                    
                case 0xff:
                    ae = pt2([0x21, 0xff]);
                    break;
                    
                case 0x01:
                    pte[l] = pt2([0x21, 0x01]);
                    break;
                    
                default:
                    throw Error('\nLoop bug!\nError code:\n\tpointerNumber = '+binary.getFilePointer()+'\n\tl = '+l+'\n\tj = 0x'+j.toString(16)+'\n\tid[l] = '+id[l]+'\n\tlct[l] = '+lct[l]+'\n\ttbid[l] = '+tbid[l]+'\n\tgce[l] = '+gce[l]+'\n\tce[l] = '+ce[l]+'\n\tae = '+ae+'\n\tpte[l] = '+pte[l]);
            }
            
        }
    }
    trailer = 0x3b;
    
    
    function pt1(n){
        var a = new Array(n), i;
        for(i=0; i<n; i++)
            a[i] = binary.readNumber(1);
        return a;
    }

    function pt2(a){
        var i, n;
        while((n=binary.readNumber(1))){
            a.push(n);
            for(i=0; i<n; i++) a.push(binary.readNumber(1));
        }
        a.push(0);
        return a;
    }
    
    this.header = function(){
        return header;
    }

    this.lsd = function(){
        return lsd;
    }
    
    this.gct = function(){
        return gct;
    }
    
    this.id = function(n){
        return id[n];
    }

    this.lct = function(n){
        return lct[n];
    }
    
    this.tbid = function(n){
        return tbid[n];
    }
    
    this.gce = function(n){
        return gce[n];
    }

    this.ce = function(n){
        return ce[n];
    }
    
    this.ae = function(){
        return ae;
    }
    
    this.pte = function(n){
        return pte[n];
    }
    
    this.trailer = function(){
        return trailer;
    }
    
    this.length = function(){
        return l;
    }
    
    this.frameImage = function(n){
        var i = [];
        if(lsd[4]>>7) i = i.concat(gct);
        if(ae) i = i.concat(ae);
        if(gce[n]) i = i.concat(gce[n]);
        if(id[n][9]>>7) i = i.concat(id[n], lct[n]);
        else i = i.concat(id[n]);
        
        return 'data:image/gif;base64,' + base64encode(String.fromCharCode.apply(String, [].concat(header, lsd, i, tbid[n], 0x3b)));
    }
    
    this.textEncode = function(s){
        return base64encode(String.fromCharCode.apply(String, s));
    }
    
    this.unLZW = function(n){
        
        var startTime = new Date().getTime();
        
        var fW = id[n][5] | id[n][6]<<8,
        fH = id[n][7] | id[n][8]<<8,
        colorTable = lsd[4]>>7 ? gct : lct[n],
        dictionary = new Array(4096),
        buffer = new Uint8Array(fW*fH),
        ImageBlock = tbid[n],
        MCS = ImageBlock[0],
        CC = 1 << MCS,
        EOI = CC + 1,
        NextCode = CC + 2,
        CodeSize = MCS + 1,
        i, C, j = 0,
        old_code = -1,
        pix = 0;
        
        for(i=0; i<CC; i++){
            dictionary[i] = new Uint8Array(1);
            dictionary[i][0] = i;
        }
        
        var bit_pos = 0,//既に読み込んであるビット数?
        p = 1;
        BlockSize = 0;
            a : while(true){
                C = 0;
                for(i = 0; i < CodeSize; i++) {
                    if(j == BlockSize && !bit_pos) { // j==bit_pos==0
                        p += BlockSize + 1; // p をBlockSize + 1 分動かす。( 次の BlockSize に標準を合わせる )ただし、動かすのは前回のBlockSize+1分である
                        j = 0;
                        BlockSize = ImageBlock[p-1];
                        if(!BlockSize) // BlockSize == 0
                            break a;
                    }
                    C |= ((ImageBlock[p+j]>>bit_pos) &1) << i; // 下位1bitから読んでいく
                    bit_pos++;
                    // 8bit読んだら次のbyteに移る。
                    bit_pos %= 8;
                    if(!bit_pos) // if(bit_pos == 8) bit_pos = 0, n++;
                        j++;
                }
                
                if(C == CC){ // 符号化コード == クリアコード
                    CodeSize = MCS + 1;
                    NextCode = CC + 2;
                    old_code = -1;
                    continue;
                }
            
                if(C == EOI)//符号化コード == 終了コード
                    break;
                
                if(C > NextCode)
                    throw Error("\nRead error!\n\tC = "+C+"\n\tNextCode = "+NextCode);
                
                if(old_code != -1)
                    (dictionary[NextCode] = new Uint8Array(dictionary[old_code].length + 1)).set(dictionary[old_code]),
                    dictionary[NextCode][dictionary[old_code].length] = dictionary[C != NextCode++ ? C : old_code][0];
                buffer.set(dictionary[old_code = C], pix);
                pix += dictionary[old_code].length;
                
                if(CodeSize < 12 && NextCode == 1 << CodeSize)
                    CodeSize++;
                
            }
        
        
        var finishTime = new Date().getTime();
        
        
        var ele = $('.log')
        var t, buffer2;
        
        
        if($('#time').is(':checked'))
            ele.eq(0).append("this.unLZW() : " + (finishTime - startTime) + "ms<br>");
        
        
        if($('input[name="out"]:checked').val() == "unLZW"){
        
            if($('#data').is(':checked')){
                t = "";
                buffer2 = new Array(fW*fH);
            
                for(i=0, l=fW*fH; i<l; i++)
                    buffer2[i] = (toHex(colorTable[3*buffer[i]])) + (toHex(colorTable[3*buffer[i]+1])) + (toHex(colorTable[3*buffer[i]+2]));
                
                for(j=0; j<fH; j++){
                    t += "<tr>";
                    for(i=0; i<fW; i++)
                        t += "<td width='1px' height='1px' style='padding: 0' bgcolor='#" + buffer2[(j*fW)+i] + "'></td>";
                    t += "</tr>";
                }
                ele.eq(1).append("<table border='0' cellspacing='0'><tbody>" + t + "</tbody></table>");
            }
        
        
            if($('#dictionary').is(':checked')){
                t = "";
                for(i=0; i<NextCode; i++){
                    t += "dictionary[" +i+ "] = ";
                    if(dictionary[i]){
                        for(j=0, l=dictionary[i].length; j<l; j++)
                            t += dictionary[i][j] + ", ";
                        t = t.slice(0, t.length-2);
                    }else
                        t += "undefined";
                    t += "<br>";
                }
                ele.eq(2).append(t);
            }
        
        }
        
        
        return buffer;
    }
    
}

function toHex(n){
    return ((n&0xF0)>>4).toString(16) + (n&0x0F).toString(16);
}

function LZW(ctl, buffer) {
    
    var startTime = new Date().getTime();
    
    var MCS = (CodeSize = getDigit(ctl)) -1,
    NextCode = (EOI = (CC = ctl) + 1) + 1,
    max_p = buffer.length,
    dictionary = new Uint16Array(1048575), // MAX : 1048575((NextCode + max_p) << 8)
    p = 1,
    old_code = buffer[0],
    C;
            
    var a = 0, // ビット列の取得したビット数
    lzw = new Uint8Array(max_p + 4),
    byte_p = 2,
    b, c;
    lzw[0] = MCS;
    
    b = 0; // CodeSizeにおいて、取得したビット数
    while(CodeSize > b){
        lzw[byte_p] |= (CC >> b) << a;
        c = b;
        b += 8 - a;
        a += CodeSize - c;
        if(a >= 8){
            a = 0;
            byte_p++;
            if(((byte_p - 1) % 256) == 0){
                lzw[byte_p - 256] = 255;
                byte_p++;
            }
        }
    }
    
    while(max_p >= p){
        
        // old_code << 24 | C が指定された辞書番号
        C = buffer[p++];
        if(dictionary[old_code << 8 | C] == 0){ // C が辞書に登録されていない場合
            dictionary[old_code << 8 | C] = NextCode++; // dictionary["oldcode" + "C"] = NextCode
            // old_code を出力
            //alert("old_code = " + old_code + "\nCodeSize = " + CodeSize);
            
            b = 0; // CodeSizeにおいて、取得したビット数
            while(CodeSize > b){
                lzw[byte_p] |= (old_code >> b) << a;
                c = b;
                b += 8 - a;
                a += CodeSize - c;
                if(a >= 8){
                    a = 0;
                    byte_p++;
                    if(((byte_p - 1) % 256) == 0){
                        lzw[byte_p - 256] = 255;
                        byte_p++;
                    }
                }
            }
            
            old_code = C;
            
            
        }else{ // C が辞書に登録されている場合
            
            old_code = dictionary[old_code << 8 | C];
            
        }
        
        if(NextCode == 4096){
            
            b = 0; // CodeSizeにおいて、取得したビット数
            while(CodeSize > b){
                lzw[byte_p] |= (CC >> b) << a;
                c = b;
                b += 8 - a;
                a += CodeSize - c;
                if(a >= 8){
                    a = 0;
                    byte_p++;
                    if(((byte_p - 1) % 256) == 0){
                        lzw[byte_p - 256] = 255;
                        byte_p++;
                    }
                }
            }
            
            NextCode = EOI + 1;
            CodeSize = MCS + 1;
            dictionary = new Uint16Array(1048575);
        }
        
        if(CodeSize < 12 && NextCode == (1 << CodeSize) + 1)
            CodeSize++;
        
    }
    b = 0; // CodeSizeにおいて、取得したビット数
    while(CodeSize > b){
        lzw[byte_p] |= (EOI >> b) << a;
        c = b;
        b += 8 - a;
        a += CodeSize - c;
        if(a >= 8){
            a = 0;
            byte_p++;
            if(((byte_p - 1) % 256) == 0){
                lzw[byte_p - 256] = 255;
                byte_p++;
            }
        }
    }
    lzw[byte_p - ((byte_p - 1) % 256)] |= (byte_p - 1) % 256; // 残りのブロックサイズを代入
    if(a != 0)
        byte_p++;
    lzw[byte_p++] = 0; // 終了を示す値を代入
    
    
    var finishTime = new Date().getTime();
    
    
    var ele = $('.log');
    var i, t, array, n, dictionary2;
    
    
    if($('#time').is(':checked'))
        ele.eq(0).append("function LZW()   : " + (finishTime - startTime) + "ms<br>");
    
    
    if($('input[name="out"]:checked').val() == "LZW"){
        
        if($('#data').is(':checked')) {
            t = "<table border='0'><tbody><tr>";
            array = lzw.subarray(0, byte_p);
            n = array.length;
            for(i=0; i<n; i++){
                t += "<td>" + (toHex(array[i]).toUpperCase()) + "</td>";
                if(i != 0 && ((i+1) % 10) == 0)
                    t += "</tr><tr>";
            }
            t += "</tr></tbody></table>";
            ele.eq(1).append(t);
        }
    
    
        if(0 /*$('#dictionary').is(':checked')*/){
            t = "";
            //for(i=0, n=dictionary.length; i<n; i++)
            //    dictionary2[dictionary[i]] = i;
            for(i=0; i<1048575; i++)
                t += "dictionary[0x" + (textTo16(i, 5)) + "] = " + dictionary[i] +"<br>";
            ele.eq(2).append(t);
        }
    
    }
    
    return lzw.subarray(0, byte_p);
}

function unLZW(pixSize, tbid) {
    
    var startTime = new Date().getTime();
    
    var dictionary = new Array(4096),
    buffer = new Uint8Array(pixSize),
    CodeSize = (MCS = tbid[0]) + 1,
    NextCode = (EOI = (CC = 1 << MCS) + 1) + 1,
    j = 0,
    pix = 0,
    bit_pos = 0,
    BlockSize = 0,
    p = 1,
    old_code = -1,
    i, C;
        
    for(i=0; i<CC; i++){
        dictionary[i] = new Uint8Array(1);
        dictionary[i][0] = i;
    }
        
        a : while(true){
            C = 0;
            for(i = 0; i < CodeSize; i++) {
                if(j == BlockSize && !bit_pos) {
                    p += BlockSize + 1;
                    j = 0;
                    BlockSize = tbid[p-1];
                    if(!BlockSize)
                        break a;
                }
                C |= ((tbid[p+j]>>bit_pos) &1) << i;
                bit_pos++;
                    
                bit_pos %= 8;
                if(!bit_pos)
                    j++;
            }
                
            if(C == CC){
                CodeSize = MCS + 1;
                NextCode = CC + 2;
                old_code = -1;
                continue;
            }
            
            if(C == EOI)
                break;
                
            if(C > NextCode)
                throw Error("\nRead error!\n\tC = "+C+"\n\tNextCode = "+NextCode);
                
            if(old_code != -1)
                (dictionary[NextCode] = new Uint8Array(dictionary[old_code].length + 1)).set(dictionary[old_code]),
                dictionary[NextCode][dictionary[old_code].length] = dictionary[C == NextCode++ ? old_code : C][0];
            try{
                buffer.set(dictionary[old_code = C], pix);
            }catch(e){
                alert("E : "+pix);
            }
            pix += dictionary[old_code].length;
                
            if(CodeSize < 12 && NextCode == 1 << CodeSize)
                CodeSize++;
                
        }
    
    
    var finishTime = new Date().getTime();
    
    
    var ele = $('.log');
    var t, fW, fH, img, buffer2;
    
    
    if($('#time').is(':checked'))
        ele.eq(0).append("function unLZW() : " + (finishTime - startTime) + "ms<br>");
    
    
    if($('input[name="out"]:checked').val() == "unLZW"){
        
        if($('#data').is(':checked')) {
            t = "";
            img = document.getElementById('img');
            fW = img.width;
            fH = img.height;
            buffer2 = new Uint32Array(fW*fH);
        
            //for(i=0, i=fW*fH; i<i; i++)
            //    buffer2[i] = colorTable[3*buffer[i]] << 16 | colorTable[3*buffer[i]+1] << 8 | colorTable[3*buffer[i]+2];
        
            for(j=0; j<fH; j++) {
                for(i=0; i<fW; i++){
                    t += buffer[j*fW + i] + " ";
                }
                t += ";<br>";
            }
            ele.eq(1).append(t);
        }
    
    
        if($('#dictionary').is(':checked')){
            t = "";
            for(i=0; i<NextCode; i++)
                t += "dictionary[" +i+ "] : " + dictionary[i] +"<br>";
            ele.eq(2).append(t);
        }
        
    }
        
    return buffer;
}

function getDigit(n) { // 自然数nのビット数を取得
    var d=1;
    while(n>>=1)d++;
    return d;
}

function textTo16(n, l) {
    var i;
    n = n.toString(16);
    l = l - n.length;
    for(i=0; i<l; i++)
        n = '0' + n;
    return n;
}