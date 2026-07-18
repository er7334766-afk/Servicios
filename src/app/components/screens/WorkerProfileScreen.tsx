import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ChevronLeft, MapPin, Star, Briefcase, MessageCircle, CheckCircle,
  DollarSign, Share2
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from '../shared/StarRating';
import { ReviewCard } from '../shared/ReviewCard';
import { MOCK_WORKERS, MOCK_REVIEWS, SERVICE_CATEGORIES } from '../../data/mockData';

export default function WorkerProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const worker = MOCK_WORKERS.find((w) => w.id === id) ?? MOCK_WORKERS[0];
  const reviews = MOCK_REVIEWS.filter((r) => r.targetId === worker.id);
  const categories = worker.categories.map((c) => SERVICE_CATEGORIES.find((s) => s.id === c)).filter(Boolean);

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <div className="relative">
        <ImageWithFallback
          src={worker.galleryUrls[0] ?? worker.avatarUrl}
          alt={worker.name}
          className="w-full h-52 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-10 left-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button className="absolute top-10 right-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
          <Share2 className="w-4 h-4 text-white" />
        </button>

        {/* Avatar overlapping */}
        <div className="absolute -bottom-10 left-5">
          <div className="relative">
            <ImageWithFallback
              src={worker.avatarUrl}
              alt={worker.name}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-background shadow-lg"
            />
            {worker.isAvailable && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                <CheckCircle className="w-2.5 h-2.5 text-white" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-14 px-5 flex-1">
        {/* Name + availability */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{worker.name}</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{worker.location}</span>
              <span className="text-muted-foreground text-xs">· {worker.distanceKm} km</span>
            </div>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
            worker.isAvailable ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {worker.isAvailable ? 'Disponible' : 'Ocupado'}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mt-4 py-4 border-y border-border">
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-foreground">{worker.rating}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{worker.reviewCount} reseñas</p>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Briefcase className="w-4 h-4 text-[#1A56DB]" />
              <span className="font-bold text-foreground">{worker.jobCount}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">trabajos</p>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-bold text-foreground">${worker.pricePerHour}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">por hora</p>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat!.id}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ backgroundColor: cat!.bgColor, color: cat!.color }}
              >
                {cat!.label}
              </span>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-5">
          <h3 className="text-sm font-bold text-foreground mb-2">Sobre mí</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{worker.bio}</p>
        </div>

        {/* Services */}
        <div className="mt-5">
          <h3 className="text-sm font-bold text-foreground mb-2">Servicios que ofrezco</h3>
          <div className="flex flex-wrap gap-2">
            {worker.services.map((s) => (
              <span key={s} className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full border border-[#1A56DB]/20">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Gallery */}
        {worker.galleryUrls.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold text-foreground mb-2">Galería de trabajos</h3>
            <div className="grid grid-cols-3 gap-2">
              {worker.galleryUrls.map((url, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.96 }}
                  className="aspect-square rounded-xl overflow-hidden"
                >
                  <ImageWithFallback
                    src={url}
                    alt={`Trabajo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-5 mb-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">
              Reseñas ({worker.reviewCount})
            </h3>
            <div className="flex items-center gap-1">
              <StarRating value={worker.rating} size="xs" />
              <span className="text-xs font-semibold text-foreground">{worker.rating}</span>
            </div>
          </div>
          {reviews.length > 0 ? (
            <div className="flex flex-col gap-3">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin reseñas aún</p>
          )}
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/home/chat')}
          className="flex-1 border-2 border-[#1A56DB] text-[#1A56DB] rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Chat
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/home/payment')}
          className="flex-2 bg-[#1A56DB] text-white rounded-xl py-3 px-6 font-semibold shadow-lg shadow-[#1A56DB]/30 flex-1"
        >
          Contratar ahora
        </motion.button>
      </div>
    </div>
  );
}
