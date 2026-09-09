import { useState } from "react";

const EMPTY_FORM = {
  title: "",
  description: "",
  author: "",
  narrator: "",
  categories: [],
  isPremium: false,
  isPublished: true,
  isComingSoon: false,
  scheduleDate: "",
  priority: 0,
  coverImage: "",
  bannerImage: "",
  episodes: [],
};

export default function useAudioStoryForm() {
  const [form, setForm] = useState(EMPTY_FORM);

  const ch = (e) => {
    const { name, type, checked } = e.target;
    let value = e.target.value;

    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const addEp = () => {
    setForm((f) => ({
      ...f,
      episodes: [
        ...f.episodes,
        {
          title: "",
          description: "",
          duration: "",
          audioUrl: "",
          thumbnailUrl: "",
        },
      ],
    }));
  };

  const removeEp = (episodeIndex) => {
    setForm((f) => ({
      ...f,
      episodes: f.episodes.filter((_, j) => j !== episodeIndex),
    }));
  };

  const chEp = (episodeIndex, field, value) => {
    setForm((f) => ({
      ...f,
      episodes: f.episodes.map((ep, j) =>
        j === episodeIndex ? { ...ep, [field]: value } : ep
      ),
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
  };

  return {
    form,
    setForm,
    ch,
    addEp,
    removeEp,
    chEp,
    resetForm,
  };
}
