// The load rule of <sf-effect>. The about menu draws sf-menu-context, which the
// Loader fetches when the menu first opens (SF.Loader.ensure), so it is not a
// relation here: a page with an effect does not load a menu it may never open.
SF.RuleLoader['cl-effect'] = {
  tags: ['sf-effect'],
  type: 'smart',
  mode: 'smart',
  js: true,
  css: true,
};
