export const SEED_NICKNAMES = [
  "阿茶", "老周", "小满", "林间", "阿吉", "木鱼",
  "云片糕", "陶陶", "白露", "阿禾", "拾光", "一勺"
];

export const SEED_CONTENTS = [
  "今天泡了一壶陈年普洱，回甘很长，一整个下午都安静下来了。",
  "隔壁工位换了个新同事，第一天就带了自家做的桂花糕来分。",
  "下雨天最适合煮茶。窗外雨声，屋里水汽，什么都不想做。",
  "求推荐一首适合读书时循环的歌，最近耳朵有点挑。",
  "把阳台的旧木桌擦干净了，铺了块格子布，突然有了个喝茶的角落。\n下午三点阳光刚好。",
  "藏了三年的白茶开罐了，枣香比想象中明显。",
  "有人一起拼一壶白茶吗？下午三点，老地方见。",
  "刚学会用盖碗，手忙脚乱地烫了两次，但茶是真的香。",
  "读到一句很喜欢的话：慢慢来，比较快。",
  "晚饭后散步四十分钟，路过一家开在巷子深处的小茶馆。",
  "整理冰箱发现半年前买的桂花，居然还香。明天泡一杯。",
  "今天的第一杯茶是冷的，因为泡完忘了喝。有点可惜。",
  "茶凉了可以续，话说一半就太可惜了。\n所以，继续聊。",
  "想给书桌换个位置，靠窗但会晒。纠结了一个小时还没动。",
  "老周带来的茶点太甜，配苦一点的茶刚好平衡。",
  "第一次认真洗了一把紫砂壶，水都染成淡茶色了。",
  "周末打算去山上走走，顺便看看有没有早春的芽。",
  "深夜煮了壶熟普，屋子里像点了暖灯。"
];

/* 每条相对上一条再往前推的秒数，覆盖 刚刚 / 分钟 / 小时 / 天 */
const GAPS = [30, 6 * 60, 45 * 60, 3 * 3600, 6 * 3600, 18 * 3600, 22 * 3600, 26 * 3600, 30 * 3600, 36 * 3600];

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function seedId(index) {
  const random = Math.random().toString(36).slice(2, 8);
  return `seed-${index}-${Date.now().toString(36)}-${random}`;
}

export function createSeedMessages(now = Date.now(), count = 10) {
  const nicknames = shuffle(SEED_NICKNAMES);
  const contents = shuffle(SEED_CONTENTS);
  const messages = [];
  let offset = 0;

  for (let i = 0; i < count; i += 1) {
    offset += (GAPS[i % GAPS.length] + Math.floor(Math.random() * 60)) * 1000;
    messages.push({
      id: seedId(i),
      nickname: nicknames[i % nicknames.length],
      content: contents[i % contents.length],
      createdAt: now - offset
    });
  }

  return messages;
}
