<?php
namespace lib;

/**
 * HTTPResponse represente le reponse HTTP.
 * @author $imon
 * @version 1.0
 */
class HTTPResponse {
	/**
	 * Le contenu de la reponse
	 * @var string
	 */
	protected $contents;

	/**
	 * Ajouter une en-tete HTTP.
	 * @param string $header L'en-tete.
	 */
	public function addHeader($header)
	{
		header($header);
	}

	/**
	 * Enlever une en-tete HTTP.
	 * @param string $header L'en-tete.
	 */
	public function removeHeader($header)
	{
		header_remove($header);
	}

	/**
	 * Rediriger l'utilisateur vers une autre URL.
	 * @param string $location L'URL de destination.
	 */
	public function redirect($location)
	{
		header('Location: '.$location);
		exit;
	}

	/**
	 * Envoyer la reponse.
	 */
	public function send()
	{
		exit($this->contents);
	}

	/**
	 * Ajouter du texte au contenu de la reponse.
	 * @param string $contents Le texte a ajouter.
	 */
	public function addContent($contents)
	{
		$this->contents .= $contents;
	}

	// Changement par rapport à la fonction setcookie() : le dernier argument est par défaut à true
	/**
	 * Definir un cookie.
	 * @param string $name Le nom du cookie.
	 * @param mixed $value La valeur du cookie.
	 * @param int $expire La duree d'expiration.
	 * @param string $path Le chemin pour lequel le cookie est actif.
	 * @param string $domain Le domaine pour lequel le cookie est actif.
	 * @param bool $secure Definit si le cookie est securise.
	 * @param bool $httpOnly Definit si le cookie ne fonctionne qu'avec le protocole HTTP
	 */
	public function setCookie($name, $value = '', $expire = 0, $path = null, $domain = null, $secure = false, $httpOnly = true)
	{
		setcookie($name, $value, $expire, $path, $domain, $secure, $httpOnly);
	}

	/**
	 * Recuperer le contenu de la reponse.
	 */
	public function getContents() {
		return $this->contents;
	}
}