const copyButtonOptions = {
  iconStyle: 'font-size: 15px; opacity: 0.4;',
  iconClass: 'mdi mdi-content-copy',
  buttonStyle: 'position: absolute; top: 7.5px; right: 6px; cursor: pointer; outline: none;',
  buttonClass: ''
};

function renderCode(origRule) {
  return (tokens, idx, options, env, self) => {
    const origRendered = origRule(tokens, idx, options, env, self);
    if (tokens[idx].tag === "code" && !tokens[idx].info) {
      return origRendered;
    }
    if (tokens[idx].content.length === 0) {
      return origRendered;
    }

    return `
<div style="position: relative">
	${origRendered.replace(/<code /, `<code id="code-${idx}"`)}
	<button class="tdbc-code-copy ${copyButtonOptions.buttonClass}" 
	  data-clipboard-target="#code-${idx}" 
	  style="${copyButtonOptions.buttonStyle}" title="Copy">
	  <span>
		  <span style="${copyButtonOptions.iconStyle}" class="${copyButtonOptions.iconClass}"></span>
		</span>
	</button>
</div>
`;
  };
}

module.exports = (md, options) => {
  md.renderer.rules.fence = renderCode(md.renderer.rules.fence, options);
};
