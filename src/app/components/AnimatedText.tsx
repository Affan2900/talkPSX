import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

type AnimatedTextProps = {
  texts: string[]; // The array of texts to be animated.
};

export default function AnimatedText({ texts }: AnimatedTextProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const displayText = useTransform(rounded, (latest) => texts[currentTextIndex].slice(0, latest));

  useEffect(() => {
    const textLength = texts[currentTextIndex].length;
    const duration = isDeleting ? 1.5 : 5;

    const controls = animate(count, isDeleting ? 0 : textLength, {
      type: "tween",
      duration,
      ease: "linear",
      onUpdate: (latest) => {
        if (latest === textLength && !isDeleting) {
          setAnimationCompleted(true);
          setTimeout(() => setIsDeleting(true), 1000); // Wait 1 second before starting to delete
        } else if (latest === 0 && isDeleting) {
          setIsDeleting(false);
          setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
          setAnimationCompleted(false);
        }
      },
    });

    return controls.stop;
  }, [currentTextIndex, isDeleting, texts]);

  return (
    <p className={animationCompleted ? "animation-completed" : ""}>
      <motion.span>{displayText}</motion.span>
      <motion.span
        className="cursor"
        animate={{ opacity: [0, 1] }}
        transition={{ repeat: Infinity, duration: 0.2 }}
      >
        |
      </motion.span>
    </p>
  );
}