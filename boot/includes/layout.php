<?php
$t = $this->managers()->get('Translation')->load('webos');
?><!DOCTYPE html>
<!--[if lt IE 7 ]><html class="ie ie6" lang="fr"> <![endif]-->
<!--[if IE 7 ]><html class="ie ie7" lang="fr"> <![endif]-->
<!--[if IE 8 ]><html class="ie ie8" lang="fr"> <![endif]-->
<!--[if (gte IE 9)|!(IE)]><!--><html lang="fr"> <!--<![endif]-->
<head>
	<title>Symbiose</title>
	<meta charset="utf-8" />
	<meta name="description" content="#" />
	<meta name="author" content="$imon" />

	<!-- CSS -->
	<link rel="stylesheet" type="text/css" href="usr/share/css/webos/global.css" />

	<!-- MOBILE METAS -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />

	<!-- FAVICONS -->
	<link rel="shortcut icon" href="usr/share/images/distributor/icons/favicon.ico" />
	<link rel="apple-touch-icon" href="usr/share/images/distributor/icons/apple-touch-icon.png" />
	<link rel="apple-touch-icon" sizes="72x72" href="usr/share/images/distributor/icons/apple-touch-icon-72x72.png" />
	<link rel="apple-touch-icon" sizes="114x114" href="usr/share/images/distributor/icons/apple-touch-icon-114x114.png" />

	<!-- SCRIPTS -->
	<!--[if lt IE 9]>
		<script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>
	<![endif]-->
	<script type="text/javascript">
		if (!window.Webos) {
			window.Webos = {
				name: 'Symbiose'
			};
			window.W = window.Webos;
		}
	</script>
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
			<p>
				<strong><?php echo $t->get('Your web browser doesn\'t support ${webos}', array('webos' => 'Symbiose')); ?></strong> : <?php echo $t->get('Javascript is required to launch it.'); ?><br /><?php echo $t->get('Please update your web browser (${download-link}) or turn on Javascript.', array('download-link' => '<a href="http://www.mozilla.org/fr/firefox/new/" target="_blank">'.$t->get('download ${browser}', array('browser' => 'Mozilla Firefox')).'</a>')); ?>
			</p>
		</div>
	</noscript>
	<div id="webos-loading" style="display: none;">
		<div class="center">
			<h1>symbiose</h1>
			<p><?php echo $t->get('Loading...'); ?></p>
		</div>
	</div>
	<div id="webos-error" style="display: none;">
		<div class="center">
			<h1>symbiose</h1>
			<p></p>
			<ul></ul>
		</div>
	</div>
</body>
</html>