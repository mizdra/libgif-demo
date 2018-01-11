function main(url){
  var gif, length, buffer, lzw;
  $('.log').empty();
  
  gif = new libgif(url); // gifをlibgifに登録
  
  length = 2 << ((gif.lsd()[4] >> 7 ? gif.lsd()[4] : gif.lct(0)[5]) &7); // カラーテーブルのインデックス数を取得
  
  buffer = gif.unLZW(0);
  
  lzw = LZW(length, buffer);
}

$(function(){
  
  function format1(state) {
      return "<table><tbody><td width='48px' height='48px'>" + (state.element[0].id ? "<span class='ui-icon ui-icon-folder-collapsed'></span>" : "<img class='img' src='" + state.id + "'/>") + "</td><td>" + state.text + "</td></tbody></table>";
  }
  
  function format2(state) {
      return state.text;
  }
  $('#imgPass').select2({
      width: '250px',
      formatResult: format1,
      formatSelection: format2
  }).on('change', function(e) {
      if(e.target.selectedOptions[0].id == "other")
          $('#file').button('enable');
      else
          $('#file').button('disable');
  });
  
  $('#s2id_imgPass').attr('title', "使用する画像を選択できます。\n「ファイルを選択」を選択することで、下のボタンでローカルにあるファイルも使用できます。");
  
  $('#file').button();
  
  $('#play').button({
      icons: {
          primary: 'ui-icon-play'
      }
  }).click(function() {
      main($('#imgPass').val());
  });
  
  $('#file').change(function(e) {
      var reader = new FileReader();
      reader.onload = function() {
          $('#other').val(reader.result);
      }
      reader.readAsDataURL(e.target.files[0]);
  });
  
  $('#out, #mode').buttonset();
  
  $('#mode').change(function() {
      $('#dictionary').button($('#LZW').is(':checked') ? 'disable' : 'enable');
  });
});