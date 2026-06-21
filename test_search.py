import urllib.parse
import urllib.request
import json

BASE = "http://localhost:5002"

def test_endpoint(path, params, name):
    print(f"\n=== {name} ===")
    query = urllib.parse.urlencode(params)
    url = f"{BASE}{path}?{query}"
    print(f"URL: {url}")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, list):
                print(f"返回 {len(data)} 条结果")
                for item in data[:3]:
                    if 'title' in item and ('venue_name' in item or 'venue' in item):
                        print(f"  - {item.get('title')} @ {item.get('venue_name') or item.get('venue')}")
                    elif 'content' in item:
                        print(f"  - {item.get('author', '匿名')}: {item.get('content', '')[:60]}...")
                    elif 'name' in item:
                        print(f"  - {item.get('name')} ({item.get('location', '')})")
                    elif 'title' in item:
                        print(f"  - {item.get('title')} ({item.get('year', '')}) 导演: {item.get('director', '')}")
                    else:
                        print(f"  - {json.dumps(item, ensure_ascii=False)[:100]}")
            elif isinstance(data, dict):
                if 'types' in data:
                    print("统一搜索结果:")
                    for k, v in data.get('types', {}).items():
                        print(f"  {k}: {len(v)} 条")
                else:
                    print(f"返回对象: {json.dumps(data, ensure_ascii=False)[:200]}")
    except Exception as e:
        print(f"错误: {e}")

# 测试 venues 搜索
test_endpoint("/api/venues", {"search": "北京"}, "Venues 搜索 '北京'")

# 测试 screenings 搜索
test_endpoint("/api/screenings", {"search": "中国电影资料馆"}, "Screenings 搜索 '中国电影资料馆'")

# 测试 films 搜索
test_endpoint("/api/films", {"search": "王家卫"}, "Films 搜索 '王家卫'")

# 测试 reviews 搜索
test_endpoint("/api/reviews", {"search": "王家卫"}, "Reviews 搜索 '王家卫'")

# 测试 reviews 按心情筛选
test_endpoint("/api/reviews", {"mood": "感动"}, "Reviews 按心情筛选 '感动'")

# 测试 screenings 按状态筛选
test_endpoint("/api/screenings", {"ticket_status": "on_sale"}, "Screenings 按状态筛选 'on_sale'")

# 测试统一搜索
test_endpoint("/api/search", {"q": "王家卫"}, "统一搜索 '王家卫'")

# 测试统一搜索 - 限定类型
test_endpoint("/api/search", {"q": "北京", "type": "venues,screenings"}, "统一搜索 '北京' (限定 venues,screenings)")

print("\n✅ 所有测试完成")
