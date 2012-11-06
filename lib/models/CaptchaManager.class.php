<?php
namespace lib\models;

/**
 * CaptchaManager permet de gerer les captcha (codes de verification).
 * @author $imon
 * @version 1.0
 */
class CaptchaManager extends \lib\Manager {
	/**
	 * Recuperer un captcha.
	 * @param int $id L'id du captcha.
	 * @throws InvalidArgumentException
	 */
	public function get($id = null) {
		if ($id === null)
			return new Captcha($this->webos);

		if (!array_key_exists($id, $_SESSION['captcha']))
			throw new \InvalidArgumentException('Le captcha ayant l\'id #'.$id.' n\'existe pas. Votre session doit &ecirc;tre p&eacute;rim&eacute;e, veuillez r&eacute;essayer');

		$captcha = unserialize($_SESSION['captcha'][$id]);
		$captcha->setWebos($this->webos);

		return $captcha;
	}
}