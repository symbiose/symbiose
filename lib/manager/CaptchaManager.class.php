<?php
namespace lib\manager;

use \lib\entities\Captcha;

//Initialize sessions
if (!isset($_SESSION)) {
	session_start();
}
if (!isset($_SESSION['captcha'])) {
	$_SESSION['captcha'] = array();
}

/**
 * Manage captchas.
 * @author $imon
 */
class CaptchaManager extends \lib\Manager {
	/**
	 * Get a captcha.
	 * @param int $id The captcha id.
	 */
	public function get($id) {
		if (!isset($_SESSION['captcha'][$id])) {
			throw new \InvalidArgumentException('Cannot find captcha with id #'.$id.'. Your session might be outdated, please try again');
		}

		$captcha = unserialize($_SESSION['captcha'][$id]);

		return $captcha;
	}

	protected function _buildCaptcha($captchaData) {
		return new Captcha($captchaData);
	}

	/**
	 * Generate a random math captcha.
	 * @return Captcha
	 */
	protected function _generateMath() {
		$n1 = mt_rand(0,10);
		$n2 = mt_rand(0,10);
		$humanNbr = array('zero','one','two','three','for','five','six','seven','height','nine','ten');
		$result = $n1 + $n2;
		$question = 'How much is ' . $humanNbr[$n1] .' plus ' . $humanNbr[$n2] . '?';

		$captcha = $this->_buildCaptcha(array(
			'question' => $question,
			'result' => $result,
			'type' => Captcha::TYPE_QUESTION
		));

		return $captcha;
	}

	/**
	 * Generate a random number.
	 * @param int $n The number of digits.
	 * @return int
	 */
	protected function _randNbr($n) {
		return str_pad(mt_rand(0,pow(10,$n)-1),$n,'0',STR_PAD_LEFT);
	}

	/**
	 * Generate a random captcha image.
	 * @return string The base64-encoded image.
	 */
	protected function _generateImage() {
		$result = $this->_randNbr(5);

		$size = 32;
		$marge = 15;
		$font = 'usr/share/fonts/angelina/angelina.ttf';

		$matrix_blur = array(
			array(1,1,1),
			array(1,1,1),
			array(1,1,1)
		);

		$box = imagettfbbox($size, 0, $font, $result);
		$largeur = $box[2] - $box[0];
		$hauteur = $box[1] - $box[7];
		$largeur_lettre = round($largeur/strlen($result));

		$img = imagecreate($largeur+$marge, $hauteur+$marge);
		$blanc = imagecolorallocate($img, 255, 255, 255);
		$noir = imagecolorallocate($img, 0, 0, 0);

		$colors = array(
			imagecolorallocate($img, 0x99, 0x00, 0x66),
			imagecolorallocate($img, 0xCC, 0x00, 0x00),
			imagecolorallocate($img, 0x00, 0x00, 0xCC),
			imagecolorallocate($img, 0x00, 0x00, 0xCC),
			imagecolorallocate($img, 0xBB, 0x88, 0x77)
		);

		for($i = 0; $i < strlen($result); ++$i) {
			$l = $result[$i];
			$angle = mt_rand(-35,35);
			imagettftext($img, mt_rand($size-7,$size), $angle, ($i*$largeur_lettre)+$marge, $hauteur+mt_rand(0,$marge/2), $colors[array_rand($colors)], $font, $l);
		}

		//imageline($img, 2, mt_rand(2,$hauteur), $largeur+$marge, mt_rand(2,$hauteur), $noir);
		//imageline($img, 2, mt_rand(2,$hauteur), $largeur+$marge, mt_rand(2,$hauteur), $noir);

		imageconvolution($img, $matrix_blur, 9, 0);
		//imageconvolution($img, $matrix_blur, 9, 0);

		// start buffering
		ob_start();
		imagepng($img);
		$contents = ob_get_contents();
		ob_end_clean();

		imagedestroy($img);

		$captcha = $this->_buildCaptcha(array(
			'question' => base64_encode($contents),
			'result' => $result,
			'type' => Captcha::TYPE_IMAGE
		));

		return $captcha;
	}

	public function generate() {
		if (extension_loaded('gd') && function_exists('gd_info')) {
			$captcha = $this->_generateImage();
		} else {
			$captcha = $this->_generateMath();
		}

		$keys = array_keys($_SESSION['captcha']);
		$id = (count($keys) > 0) ? array_pop($keys) + 1 : 0;

		$captcha->setId($id);

		//Save captcha
		$_SESSION['captcha'][] = serialize($captcha);

		return $captcha;
	}
}