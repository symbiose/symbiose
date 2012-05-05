<!DOCTYPE html>
<!--[if lt IE 7 ]><html class="ie ie6" lang="fr"> <![endif]-->
<!--[if IE 7 ]><html class="ie ie7" lang="fr"> <![endif]-->
<!--[if IE 8 ]><html class="ie ie8" lang="fr"> <![endif]-->
<!--[if (gte IE 9)|!(IE)]><!--><html lang="fr"> <!--<![endif]-->
<head>

	<title>Symbiose</title>
	<meta charset="utf-8" />
	<meta name="description" content="#" />
	<meta name="author" content="$imon" />
	<!--[if lt IE 9]>
		<script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>
	<![endif]-->
	
	<!-- CSS -->
	<link rel="stylesheet" type="text/css" href="usr/share/css/webos/global.css" />

	<!-- MOBILE METAS -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
	
	<!-- FAVICONS -->
	<link rel="shortcut icon" href="usr/share/images/distributor/icons/favicon.ico" />
	<link rel="apple-touch-icon" href="usr/share/images/distributor/icons/apple-touch-icon.png" />
	<link rel="apple-touch-icon" sizes="72x72" href="usr/share/images/distributor/icons/apple-touch-icon-72x72.png" />
	<link rel="apple-touch-icon" sizes="114x114" href="usr/share/images/distributor/icons/apple-touch-icon-114x114.png" />
	
	<?php
	foreach($jsIncludes as $include) { //On inclut les fichiers JS de base
		echo '<script type="text/javascript" src="'.$include.'"></script>';
	}
	?>
</head>
<body>

	<div id="userinterfaces"></div>
	<noscript id="webos-unsupported">
		<div class="center">
			<h1>symbiose</h1>
			<p class="error">
				<strong>Votre navigateur ne supporte pas le webos</strong> : Javascript est requis pour le faire fonctionner.<br />Veuillez mettre &agrave; jour votre navigateur (<a href="http://www.mozilla.org/fr/firefox/new/" target="_blank">t&eacute;l&eacute;chargez Mozilla Firefox</a>) ou r&eacute;activer Javascript.
			</p>
		</div>
	</noscript>
	<div id="webos-loading" style="display: none;">
		<div class="center">
			<h1>symbiose</h1>
			<p>
				Chargement en cours...
			</p>
		</div>
	</div>
	
</body>
</html>
