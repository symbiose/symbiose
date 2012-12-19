<?php
//On affiche les erreurs
if (!ini_get('display_errors')) {
    ini_set('display_errors', 1);
}
error_reporting(E_ALL);

session_start(); //On demarre les sessions

chdir(dirname(__FILE__).'/..'); //On se place a la racine

//On definit le fuseau horaire par defaut
date_default_timezone_set('Europe/Paris');

//On definit le temps d'execution maximum
set_time_limit(30);

function autoload($class) //Fonction qui permet de charger automatiquement une classe
{
	$file = './'.str_replace('\\', '/', $class).'.class.php';
	if (file_exists($file)) {
		return require $file;
	}
}

// N'oublions pas d'ajouter notre fonction à la pile d'autoload
spl_autoload_register('autoload');

function getPHPVersionId($version) { //Permet de recuperer l'ID de la version de PHP
	$version = explode('.', $version);
	return ($version[0] * 10000 + $version[1] * 100 + $version[2]);
}

if (!defined('PHP_VERSION_ID')) { //Si l'ID de la version actuelle de PHP n'est pas definie
	define('PHP_VERSION_ID', getPHPVersionId(PHP_VERSION));
}

$minPHPVersion = file_get_contents('boot/phpversion.txt'); //Version minimum requise pour le fonctionnement du WebOS
if (PHP_VERSION_ID < getPHPVersionId($minPHPVersion)) { //Si la version est trop ancienne, on declanche une erreur
	trigger_error('La version '.$minPHPVersion.' de PHP est requise, la version actuelle est '.PHP_VERSION, E_USER_ERROR);
}

// Configuration du gestionnaire d'erreurs
set_error_handler(array('lib\Error','trigger'));
register_shutdown_function(array('lib\Error','lookForFatalError'));