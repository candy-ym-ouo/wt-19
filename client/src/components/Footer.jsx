export default function Footer() {
  return (
    <footer className="border-t border-film-gray/50 mt-20 bg-film-dark/50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-serif font-bold text-film-gold mb-3">光影札记</h3>
            <p className="text-sm text-film-cream/60 leading-relaxed">
              记录每一次与艺术电影的相遇，珍藏那些在黑暗中被光照亮的时刻。
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-film-cream/80 mb-3 tracking-wider">快捷导航</h4>
            <ul className="space-y-2 text-sm text-film-cream/60">
              <li><a href="/films" className="hover:text-film-gold transition-colors">影片库</a></li>
              <li><a href="/calendar" className="hover:text-film-gold transition-colors">放映日历</a></li>
              <li><a href="/reviews" className="hover:text-film-gold transition-colors">观后短评</a></li>
              <li><a href="/favorites" className="hover:text-film-gold transition-colors">我的收藏</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-film-cream/80 mb-3 tracking-wider">关于本站</h4>
            <p className="text-sm text-film-cream/60 leading-relaxed">
              一个为艺术电影爱好者打造的放映笔记与观影记录平台。
            </p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-film-gray/30 text-center text-xs text-film-cream/40">
          © {new Date().getFullYear()} 光影札记 Art Film Notes · 献给所有热爱电影的人
        </div>
      </div>
    </footer>
  );
}
