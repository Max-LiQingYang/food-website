import './NutritionCard.css'

export interface NutritionData {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

interface NutritionItem {
  key: keyof NutritionData
  label: string
  unit: string
  color: string
  maxValue: number
}

const NUTRITION_ITEMS: NutritionItem[] = [
  { key: 'calories', label: '热量', unit: 'kcal', color: '#E8663E', maxValue: 800 },
  { key: 'protein', label: '蛋白质', unit: 'g', color: '#FF8C42', maxValue: 60 },
  { key: 'carbs', label: '碳水', unit: 'g', color: '#52c41a', maxValue: 100 },
  { key: 'fat', label: '脂肪', unit: 'g', color: '#faad14', maxValue: 50 },
  { key: 'fiber', label: '膳食纤维', unit: 'g', color: '#1890ff', maxValue: 20 },
]

export default function NutritionCard({ nutrition }: { nutrition: NutritionData }) {
  return (
    <section className="nutrition-card">
      <h2 className="nutrition-card__title">
        🏷️ 营养信息
      </h2>
      <div className="nutrition-card__grid">
        {NUTRITION_ITEMS.map(item => {
          const value = nutrition[item.key] || 0
          const percent = Math.min((value / item.maxValue) * 100, 100)

          return (
            <div key={item.key} className="nutrition-card__item">
              <div className="nutrition-card__header">
                <span className="nutrition-card__label">{item.label}</span>
                <span className="nutrition-card__value">
                  {value} <span className="nutrition-card__unit">{item.unit}</span>
                </span>
              </div>
              <div className="nutrition-card__bar">
                <div
                  className="nutrition-card__fill"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}