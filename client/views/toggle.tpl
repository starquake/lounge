<a class="toggle-content toggle-type-{{type}}" href="{{link}}" target="_blank" rel="noopener">
	{{#equal type "photo"}}
		<img src="{{link}}" alt="{{head}}">
	{{else}}
		{{#if thumb}}
			<img src="{{thumb}}" class="thumb">
		{{/if}}
		<div class="head">{{head}}</div>
		<div class="body">{{body}}</div>
	{{/equal}}
</a>
