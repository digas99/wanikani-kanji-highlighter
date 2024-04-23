document.write(/*html*/`
<div class="topNav">
	<a href="#" title="Go back" id="goBackButton" class="clickable">
		<div>
			<i class="left"></i>
			<div id="secPageTitle"></div>
		</div>
	</a>

	<div class="topNav-lessons">
		<a title="Lessons" href="/popup/lessons.html">
			<div class="lessons-icon"><div></div></div>
			<div class="lessons-count">0</div>
		</a>
		<a title="Reviews" href="/popup/reviews.html">
			<div class="reviews-icon"><div></div></div>
			<div class="lessons-count">0</div>
		</a>
	</div>
</div>
`);

document.querySelector("#secPageTitle").innerText = document.title;