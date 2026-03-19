<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ya apna domain

$keywords = [

  'porn', 'pornography', 'xxx', 'nsfw', 'adult', 'sex', 'sexual', 'nude', 'naked', 'erotic', 'hentai',
  'fuck', 'fucking', 'fucked', 'shit', 'dick', 'penis', 'cock', 'vagina', 'pussy', 'boobs', 'breasts',
  'tits', 'ass', 'butt', 'arse', 'explicit', '18+', 'adult content', 'sexy', 'sensual', 'bdsm',
  'fetish', 'orgy', 'masturbation', 'cum', 'sperm', 'ejaculation', 'hardcore', 'softcore', 'blowjob',
  'handjob', 'fellatio', 'cunnilingus', 'anal', 'intercourse', 'prostitute', 'hooker', 'milf',
  'threesome', 'gangbang', 'incest', 'rape', 'gore', 'blood', 'violence', 'torture', 'crucifixion',
  'arousal', 'lingerie', 'bikini', 'thong', 'gore', 'taboo', 'crucified', 'suggestive', 'seductive',

  'chut', 'chutiya', 'lund', 'loda', 'lauda', 'randi', 'rand', 'bhosda', 'bhosdike', 'madarchod',
  'behenchod', 'bc', 'mc', 'gand', 'gaand', 'chodu', 'chudai', 'chud', 'pel', 'thok', 'nanga',
  'nangi', 'chuchi', 'mummay', 'mamme', 'bhenchod', 'saala', 'kutiya', 'harami', 'suar', 'lavda',
  'bakchod', 'item', 'maal', 'pataka', 'bomb', 'figure', 'sexy', 'hot', 'garam', 'chudne', 'pelna'
];

echo json_encode(['keywords' => array_unique($keywords)]);
?>